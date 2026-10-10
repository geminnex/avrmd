import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserByHandle, reservedHandles, updateUserProfile } from "@/lib/db/repositories/users";
import { getEntity } from "@/lib/catalog";
import {
  isFacetName,
  isPipelineStage,
  isProfessionalRole,
  isTopicSlug,
} from "@/lib/member-profile";

const rateLimited = rateLimiter("profile", 20, 60_000);

const handlePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const bodySchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(40)
    .regex(handlePattern, "Use lowercase letters, numbers, and hyphens only."),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  roles: z.array(z.string()).max(4).optional(),
  stages: z.array(z.string()).max(8).optional(),
  canHelpWith: z.array(z.string()).max(10).optional(),
  lookingFor: z.array(z.string()).max(10).optional(),
  topicInterests: z.array(z.string()).max(6).optional(),
  affiliationSlug: z.string().trim().max(180).optional().or(z.literal("")),
});

/**
 * Every declaration has to come from a vocabulary the site already browses
 * by — a free-text one would leave the person unreachable from the
 * directory filters that are the whole point of declaring it.
 */
function firstInvalid(
  values: string[] | undefined,
  isValid: (value: string) => boolean,
  label: string,
) {
  const bad = values?.find((value) => !isValid(value));
  return bad ? `Unknown ${label}: ${bad}` : null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Wait a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." },
      { status: 422 },
    );
  }

  const {
    handle,
    displayName,
    bio,
    roles,
    stages,
    canHelpWith,
    lookingFor,
    topicInterests,
    affiliationSlug,
  } = parsed.data;

  const vocabularyError =
    firstInvalid(roles, isProfessionalRole, "role") ??
    firstInvalid(stages, isPipelineStage, "stage") ??
    firstInvalid(canHelpWith, isFacetName, "expertise tag") ??
    firstInvalid(lookingFor, isFacetName, "tag") ??
    firstInvalid(topicInterests, isTopicSlug, "clinical area");

  if (vocabularyError) {
    return NextResponse.json({ ok: false, message: vocabularyError }, { status: 422 });
  }

  if (affiliationSlug) {
    const entity = getEntity(affiliationSlug);
    if (!entity || entity.kind !== "organization") {
      return NextResponse.json(
        { ok: false, message: "Pick an organisation that already has a record." },
        { status: 422 },
      );
    }
  }

  if (reservedHandles.has(handle) && handle !== user.handle) {
    return NextResponse.json({ ok: false, message: "That handle is reserved." }, { status: 409 });
  }

  const existing = await getUserByHandle(handle);
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ ok: false, message: "That handle is taken." }, { status: 409 });
  }

  const updated = await updateUserProfile(user.id, {
    handle,
    displayName: displayName || null,
    bio: bio || null,
    roles: roles ?? [],
    stages: stages ?? [],
    canHelpWith: canHelpWith ?? [],
    lookingFor: lookingFor ?? [],
    topicInterests: topicInterests ?? [],
    affiliationSlug: affiliationSlug || null,
  });

  return NextResponse.json({ ok: true, handle: updated.handle });
}
