/**
 * A member sees the welcome step once: until they finish or skip it, or
 * until they have said something about themselves some other way.
 */
export function needsOnboarding(user: { onboardedAt: Date | null; roles: string[]; stages: string[] }) {
  return !user.onboardedAt && user.roles.length === 0 && user.stages.length === 0;
}

/** Where to send someone right after they sign in. */
export function afterSignIn(user: Parameters<typeof needsOnboarding>[0], next: string) {
  return needsOnboarding(user) ? `/welcome${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}` : next;
}
