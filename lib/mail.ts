import nodemailer from "nodemailer";

/**
 * Sends over the SMTP env vars when they're configured and reachable.
 * Otherwise — unset, or the send itself fails — returns `sent: false` rather
 * than throwing, so the caller can fall back to showing the link on-screen.
 * That fallback is the same honest-preview pattern used everywhere else on
 * the site, scoped here to the one thing production genuinely can't do yet
 * without real SMTP credentials.
 */
export async function sendMagicLink(email: string, url: string) {
  if (!process.env.SMTP_HOST) return { sent: false as const };

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
  });

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "AVRMD <hello@localhost>",
      to: email,
      subject: "Sign in to AVRMD",
      text: `Sign in to AVRMD by opening this link (valid 15 minutes):\n\n${url}\n\nIf you didn't request this, ignore it.`,
      html: `<p>Sign in to AVRMD by opening this link (valid 15 minutes):</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, ignore it.</p>`,
    });
    return { sent: true as const };
  } catch {
    return { sent: false as const };
  }
}
