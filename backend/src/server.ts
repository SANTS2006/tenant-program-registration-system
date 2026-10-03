import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/client.js";
import { startMaintenance } from "./lib/maintenance.js";
import { startOutboxWorker } from "./modules/email/outbox.js";
import { startPaymentsWorker } from "./modules/payments/worker.js";
import { flushAudit } from "./modules/audit/recorder.js";

const app = buildApp();

// A rejected promise nobody handled is a bug to find, not a reason to take every user down.
process.on("unhandledRejection", (reason) => {
  app.log.error({ err: reason }, "Unhandled promise rejection");
});
// State after an uncaught exception can't be trusted: log it, then exit so the host restarts a clean process.
process.on("uncaughtException", (err) => {
  app.log.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

let stopWorker: (() => Promise<void>) | undefined;
let stopPayments: (() => Promise<void>) | undefined;
let stopMaintenance: (() => void) | undefined;
let shuttingDown = false;

/** On a deploy or scale-down the host sends SIGTERM: stop taking requests, let running ones finish, close the database. */
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info(`${signal} received: shutting down`);
  const force = setTimeout(() => {
    app.log.error("Shutdown took too long; exiting");
    process.exit(1);
  }, 25_000);
  force.unref();
  try {
    stopMaintenance?.();
    await stopWorker?.();
    await stopPayments?.();
    await app.close();
    // The last audit entries are written before the database connection is closed.
    await flushAudit();
    await pool.end();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "Error during shutdown");
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

app
  .listen({ port: env.API_PORT, host: "0.0.0.0", backlog: 1024 })
  .then((address) => {
    app.log.info(`Server listening at ${address}`);
    stopWorker = startOutboxWorker(app.log);
    stopPayments = startPaymentsWorker(app.log);
    stopMaintenance = startMaintenance(app.log);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
