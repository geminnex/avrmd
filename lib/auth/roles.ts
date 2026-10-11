/** Platform roles that may review the queue and contributions. */
const staffRoles = new Set(["editor", "moderator", "administrator"]);

type WithRole = { role: string } | undefined | null;

export function isStaff(user: WithRole): boolean {
  return Boolean(user && staffRoles.has(user.role));
}

/** May suspend and restore accounts. */
export function canModerate(user: WithRole): boolean {
  return user?.role === "moderator" || user?.role === "administrator";
}

/** May change roles and delete accounts. */
export function isAdministrator(user: WithRole): boolean {
  return user?.role === "administrator";
}

/** The roles an administrator can hand out from the member list. */
export const assignableRoles = ["member", "editor", "moderator", "administrator"] as const;
export type AssignableRole = (typeof assignableRoles)[number];

export const suspendedMessage = "This account is suspended. If you think this is a mistake, reply to any AVRMD email.";
