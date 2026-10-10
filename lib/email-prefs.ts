import { createHmac, timingSafeEqual } from "node:crypto";

export type EmailKind = "questions" | "answers" | "digest";
export const emailKinds: EmailKind[] = ["questions", "answers", "digest"];

export const emailKindLabels: Record<EmailKind, string> = {
  questions: "Questions asked about something I said I can help with",
  answers: "Answers to my questions, and when my answer is marked as helpful",
  digest: "A weekly digest of new FDA devices, papers, trials and questions",
};

/**
 * Unsubscribe links work without signing in, so they carry a keyed
 * signature over (member, kind): a link can only turn off that one kind of
 * email for that one member.
 */
export function unsubscribeToken(userId: string, kind: EmailKind) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for unsubscribe links.");
  return createHmac("sha256", secret).update(`unsubscribe:${userId}:${kind}`).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribeToken(userId: string, kind: string, token: string) {
  if (!emailKinds.includes(kind as EmailKind)) return false;
  const expected = Buffer.from(unsubscribeToken(userId, kind as EmailKind));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: string, kind: EmailKind) {
  const base = process.env.AUTH_URL ?? "https://avrmd.cyalin.com";
  const params = new URLSearchParams({ u: userId, k: kind, t: unsubscribeToken(userId, kind) });
  return `${base}/unsubscribe?${params}`;
}

/** Headers that let mail clients offer a one-click unsubscribe (RFC 8058). */
export function unsubscribeHeaders(userId: string, kind: EmailKind) {
  const base = process.env.AUTH_URL ?? "https://avrmd.cyalin.com";
  const params = new URLSearchParams({ u: userId, k: kind, t: unsubscribeToken(userId, kind) });
  return {
    "List-Unsubscribe": `<${base}/api/email/unsubscribe?${params}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
