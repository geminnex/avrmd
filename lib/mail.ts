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

/** Turns bare https URLs (already escaped) into links, for email footers. */
function linkify(value: string) {
  return value.replace(/https:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#087c70">${url}</a>`);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * Sends one plain message. Returns false instead of throwing when SMTP is
 * missing or the send fails; the failure is logged so a misconfigured
 * provider shows up in the service journal.
 */
export async function sendMail(message: {
  to: string;
  subject: string;
  lines: string[];
  link?: { label: string; url: string };
  replyTo?: string;
  headers?: Record<string, string>;
  footer?: string[];
}) {
  const transport = createMailTransport();
  if (!transport) return false;
  const footer = message.footer ?? [];
  const text = [
    ...message.lines,
    ...(message.link ? ["", `${message.link.label}: ${message.link.url}`] : []),
    ...(footer.length ? ["", "--", ...footer] : []),
  ].join("\n");
  const html = [
    ...message.lines.map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "")),
    message.link
      ? `<p><a href="${escapeHtml(message.link.url)}">${escapeHtml(message.link.label)}</a></p><p style="color:#6f8792;font-size:12px">${escapeHtml(message.link.url)}</p>`
      : "",
    footer.length
      ? `<hr style="border:0;border-top:1px solid #d9e5e7;margin:20px 0"><p style="color:#6f8792;font-size:12px">${footer.map((line) => linkify(escapeHtml(line))).join("<br>")}</p>`
      : "",
  ].join("");
  try {
    await transport.sendMail({
      from: mailFrom(),
      to: message.to,
      subject: message.subject,
      text,
      html,
      replyTo: message.replyTo,
      headers: message.headers,
    });
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

/**
 * A personal invitation. It reads as from the editor who sent it (replies go
 * to them) and says plainly what the site is and what is asked.
 */
export function sendInvitation(input: {
  to: string;
  name?: string | null;
  inviterName: string;
  inviterEmail: string;
  note?: string | null;
  url: string;
}) {
  return sendMail({
    to: input.to,
    replyTo: input.inviterEmail,
    subject: `${input.inviterName} invited you to AVRMD`,
    lines: [
      input.name ? `Dear ${input.name},` : "Hello,",
      "",
      ...(input.note ? [input.note, ""] : []),
      `${input.inviterName} has invited you to AVRMD, a community for people who build, test, buy and use virtual and augmented reality in medicine: clinicians, researchers, engineers, manufacturers and the business people around them.`,
      "",
      "As a member you can answer questions in your area, get the week's new FDA clearances, papers and trials that match your work, and be found by people who need your expertise. Membership is free.",
      "",
      "The link below creates your account with this address. It works once, for 30 days.",
    ],
    link: { label: "Accept the invitation", url: input.url },
    footer: [`Reply to this email to reach ${input.inviterName} directly.`, "If you'd rather not join, ignore this message; we won't write again about it."],
  });
}
