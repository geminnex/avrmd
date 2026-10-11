import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { assignableRoles, canModerate, isAdministrator } from "@/lib/auth/roles";
import { isUuid } from "@/lib/ids";
import {
  countAdministrators,
  deleteMemberAccount,
  setMemberRole,
  setMemberSuspended,
} from "@/lib/db/repositories/member-admin";
import { getUserById } from "@/lib/db/repositories/users";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), role: z.enum(assignableRoles) }),
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("delete"), confirmEmail: z.string() }),
]);

const json = (status: number, message: string) => NextResponse.json({ ok: status < 300, message }, { status });

/**
 * Member administration. Moderators suspend and restore; administrators also
 * change roles and delete. Nobody acts on their own account here, and only an
 * administrator acts on another administrator.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !canModerate(actor)) return json(404, "Not found.");
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!isUuid(id) || !parsed.success) return json(422, "Invalid request.");
  if (id === actor.id) return json(403, "You can't change your own account here.");

  const member = await getUserById(id);
  if (!member) return json(404, "That account no longer exists.");
  if (member.role === "administrator" && !isAdministrator(actor)) return json(403, "Only an administrator can change another administrator.");

  const body = parsed.data;
  if (body.action === "suspend" || body.action === "restore") {
    await setMemberSuspended(actor.id, id, body.action === "suspend");
    return json(200, body.action === "suspend" ? `${member.email} is suspended and signed out.` : `${member.email} is restored.`);
  }

  if (!isAdministrator(actor)) return json(403, "Only an administrator can do that.");
  if (body.action === "role") {
    if (member.role === "administrator" && body.role !== "administrator" && (await countAdministrators(id)) === 0) {
      return json(409, "The site needs at least one administrator.");
    }
    await setMemberRole(actor.id, id, body.role);
    const label = { member: "a member", editor: "an editor", moderator: "a moderator", administrator: "an administrator" }[body.role];
    return json(200, `${member.email} is now ${label}.`);
  }

  if (body.confirmEmail.trim().toLowerCase() !== member.email) return json(422, "Type the account's email address to confirm.");
  try {
    await deleteMemberAccount(actor.id, id);
  } catch {
    return json(409, "This account is linked to editorial records and can't be deleted. Suspend it instead.");
  }
  return json(200, `${member.email} was deleted.`);
}
