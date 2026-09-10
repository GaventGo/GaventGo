// Server-only. Talks to Resend's REST API directly via fetch — no SDK
// dependency needed, keeps package.json untouched. Never import from a
// Client Component.

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Best-effort email send — returns ok:false instead of throwing on any
 * failure, since a missing/failed email should never break the payment or
 * checkout flow that triggered it. Callers should not await this in a way
 * that blocks the response to the user.
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "GaventGo <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, error: "Email is not configured." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend error: ${body}` };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}
