import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "../db/repositories/sessions";

export const sessionCookieName = "avrmd_session";

/** Shared so every call site that sets or clears the cookie agrees on its shape. */
export function sessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : { maxAge: 0 }),
  };
}

/**
 * Read-only: safe to call from any server component, not just route
 * handlers. Every page now reaches this indirectly through the header, so a
 * database hiccup here must degrade to "signed out" rather than 500 the
 * whole site — the catalog itself has no DB dependency and shouldn't gain one.
 */
export async function getCurrentUser() {
  const store = await cookies();
  const raw = store.get(sessionCookieName)?.value;
  if (!raw) return undefined;

  try {
    return await getSessionUser(raw);
  } catch {
    return undefined;
  }
}

/** For page components behind a sign-in wall. */
export async function requireUserOrRedirect(redirectTo = "/sign-in") {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}
