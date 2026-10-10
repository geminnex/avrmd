import { eq } from "drizzle-orm";
import { getDatabase } from "../client";
import { users } from "../schema";
import type { EmailKind } from "@/lib/email-prefs";

export async function setEmailPref(userId: string, kind: EmailKind, on: boolean) {
  const [user] = await getDatabase().select({ prefs: users.emailPrefs }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return false;
  await getDatabase()
    .update(users)
    .set({ emailPrefs: { ...user.prefs, [kind]: on }, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return true;
}
