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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * Sends one plain message. Returns false instead of throwing when SMTP is
 * missing or the send fails; the failure is logged so a misconfigured
 * provider shows up in the service journal.
 */
export async function sendMail(message: { to: string; subject: string; lines: string[]; link?: { label: string; url: string }; replyTo?: string }) {
  const transport = createMailTransport();
  if (!transport) return false;
  const text = [...message.lines, ...(message.link ? ["", `${message.link.label}: ${message.link.url}`] : [])].join("\n");
  const html = [
    ...message.lines.map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "")),
    message.link
      ? `<p><a href="${escapeHtml(message.link.url)}">${escapeHtml(message.link.label)}</a></p><p style="color:#6f8792;font-size:12px">${escapeHtml(message.link.url)}</p>`
      : "",
  ].join("");
  try {
    await transport.sendMail({ from: mailFrom(), to: message.to, subject: message.subject, text, html, replyTo: message.replyTo });
    return true;
  } catch (error) {
    console.error(`Email "${message.subject}" failed`, error);
    return false;
  }
}

export function sendConfirmEmail(email: string, url: string) {
  return sendMail({
    to: email,
    subject: "Confirm your AVRMD account",
    lines: [
      "Confirm this address to finish creating your AVRMD account. The link works for 24 hours.",
      "",
      "If you didn't sign up, ignore this email and nothing will happen.",
    ],
    link: { label: "Confirm my email", url },
  });
}

export function sendAlreadyRegistered(email: string, signInUrl: string, resetUrl: string) {
  return sendMail({
    to: email,
    subject: "You already have an AVRMD account",
    lines: [
      "Someone (probably you) tried to create an AVRMD account with this address, but it already has one.",
      `Sign in at ${signInUrl}, or set a new password at ${resetUrl}.`,
      "",
      "If it wasn't you, no action is needed; your account was not changed.",
    ],
  });
}

export function sendPasswordReset(email: string, url: string) {
  return sendMail({
    to: email,
    subject: "Reset your AVRMD password",
    lines: [
      "Use this link to choose a new password. It works once, for 30 minutes, and signs you out everywhere else.",
      "",
      "If you didn't ask for this, ignore this email; your password stays the same.",
    ],
    link: { label: "Choose a new password", url },
  });
}
