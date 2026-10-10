// Verifies the SMTP settings in the environment and sends one test message.
//
//   sudo sh -c 'set -a; . /etc/avrmd.env; set +a; node scripts/check-mail.mjs you@example.com'
//
// Mirrors createMailTransport() in lib/mail.ts.
import nodemailer from "nodemailer";

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/check-mail.mjs <recipient>");
  process.exit(2);
}
if (!process.env.SMTP_HOST) {
  console.error("SMTP_HOST is not set.");
  process.exit(1);
}

const port = Number(process.env.SMTP_PORT ?? 587);
const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
const user = process.env.SMTP_USER;
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure,
  requireTLS: Boolean(user) && !secure,
  auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
});

console.log(`Connecting to ${process.env.SMTP_HOST}:${port} (${secure ? "TLS" : "STARTTLS"}) as ${user ?? "(no auth)"}…`);
try {
  await transport.verify();
  console.log("Login OK.");
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "AVRMD mail check",
    text: "If you can read this, AVRMD can send email.",
  });
  console.log(`Sent: ${info.messageId} — accepted ${JSON.stringify(info.accepted)}`);
} catch (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
