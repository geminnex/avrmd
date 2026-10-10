import nodemailer from "nodemailer";

/**
 * One transport for every message the site sends. Local development points
 * at Mailpit (no auth, plain); production points at a real provider such as
 * Purelymail (smtp.purelymail.com, 465 implicit TLS or 587 STARTTLS, the
 * full mailbox address as the username).
 */
export function createMailTransport() {
  if (!process.env.SMTP_HOST) return undefined;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const user = process.env.SMTP_USER;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    // With credentials, refuse to send them over an unencrypted connection.
    requireTLS: Boolean(user) && !secure,
    auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
}

export function mailFrom() {
  return process.env.SMTP_FROM ?? "AVRMD <hello@localhost>";
}

/**
 * Sends over the SMTP env vars when they're configured and reachable.
 * Otherwise — unset, or the send itself fails — returns `sent: false` rather
 * than throwing, so the caller can fall back to showing the link on-screen.
 */
export async function sendMagicLink(email: string, url: string) {
  const transport = createMailTransport();
  if (!transport) return { sent: false as const };

  try {
    await transport.sendMail({
      from: mailFrom(),
      to: email,
      subject: "Sign in to AVRMD",
      text: `Sign in to AVRMD by opening this link (valid 15 minutes):\n\n${url}\n\nIf you didn't request this, ignore it.`,
      html: `<p>Sign in to AVRMD by opening this link (valid 15 minutes):</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, ignore it.</p>`,
    });
    return { sent: true as const };
  } catch (error) {
    // Logged so a misconfigured provider shows up in the service journal
    // instead of silently degrading to on-screen links.
    console.error("Magic link email failed", error);
    return { sent: false as const };
  }
}
