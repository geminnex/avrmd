/** The public contact address for privacy, copyright and account matters. */
export function contactEmail() {
  if (process.env.CONTACT_EMAIL) return process.env.CONTACT_EMAIL;
  if (process.env.EDITOR_EMAIL) return process.env.EDITOR_EMAIL;
  const from = process.env.SMTP_FROM ?? "";
  return from.match(/<([^>]+)>/)?.[1] ?? "hello@avrmd.com";
}
