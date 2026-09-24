import { env } from "../../config/env.js";

interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Sends a transactional email via Brevo. If BREVO_API_KEY is not configured
 * (local/dev without real credentials), the email is logged instead of sent
 * so the rest of the flow (registration, password reset) still completes.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!env.BREVO_API_KEY) {
    console.log(`[email:dev-stub] to=${input.to} subject="${input.subject}"`);
    return;
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
        sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM_ADDRESS },
        to: [{ email: input.to, name: input.toName ?? input.to }],
        subject: input.subject,
        htmlContent: input.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Brevo email send failed (${response.status}): ${body}`);
    }
  } catch (err) {
    console.error("Brevo email send failed (network error):", err);
  }
}
