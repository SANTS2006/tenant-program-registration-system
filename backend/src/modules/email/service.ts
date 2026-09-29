import { env } from "../../config/env.js";

interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  /** Where replies should go, e.g. the person who submitted a report. */
  replyTo?: { email: string; name?: string };
  /** Shown as the sender, e.g. a business's name; the address stays the platform's own. */
  fromName?: string;
  /** Files to attach, as base64, e.g. an invoice PDF. */
  attachments?: { name: string; content: string }[];
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Sends a transactional email via Brevo. If BREVO_API_KEY is not configured
 * (local/dev without real credentials), the email is logged instead of sent
 * so the rest of the flow (registration, password reset) still completes.
 *
 * Returns whether the email was handed to Brevo, for callers (like "Send invoice") that need to
 * tell the person when it didn't go.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!env.BREVO_API_KEY) {
    console.log(`[email:dev-stub] to=${input.to} subject="${input.subject}"`);
    return true;
  }

  // Never throws: callers send email as a side effect of work that has already
  // been committed (an account created, a code stored), and a mail outage must
  // not turn that into a failed request the user can't cleanly retry.
  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: input.fromName ?? env.EMAIL_FROM_NAME, email: env.EMAIL_FROM_ADDRESS },
        to: [{ email: input.to, name: input.toName ?? input.to }],
        subject: input.subject,
        htmlContent: input.html,
        ...(input.replyTo ? { replyTo: { email: input.replyTo.email, name: input.replyTo.name ?? input.replyTo.email } } : {}),
        ...(input.attachments?.length ? { attachment: input.attachments } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Brevo email send failed (${response.status}): ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Brevo email send failed (network error):", err);
    return false;
  }
}
