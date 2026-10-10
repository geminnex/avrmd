/** Platform roles that may review the queue and contributions. */
const staffRoles = new Set(["editor", "moderator", "administrator"]);

export function isStaff(user: { role: string } | undefined | null): boolean {
  return Boolean(user && staffRoles.has(user.role));
}
