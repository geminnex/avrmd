import { catalogEntitySchema } from "./catalog-schema";
import type { CatalogEntity, EntityKind } from "./catalog-types";
import type { TriageDraft } from "./triage";

export type ReviewCandidate = {
  id: string;
  title: string;
  sourceUrl: string;
  sourceLabel: string;
  rightsBasis?: string;
  entityKindHint?: string;
  triage?: { draft?: TriageDraft };
};

/** What the editor confirms or corrects before approving. */
export type ReviewFields = {
  name: string;
  kind: EntityKind;
  typeLabel: string;
  summary: string;
  specialties: string[];
  useCases: string[];
  modalities: string[];
  stages: string[];
  geography: string;
  maturity: string;
};

const accents: Record<EntityKind, CatalogEntity["accent"]> = {
  evidence: "violet",
  solution: "blue",
  organization: "teal",
  event: "gold",
  project: "coral",
  problem: "coral",
  group: "teal",
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/, "");
}

/** The editor's starting point: the AI draft, else the candidate's own metadata. */
export function initialFields(candidate: ReviewCandidate): ReviewFields {
  const draft = candidate.triage?.draft;
  return {
    name: draft?.name ?? candidate.title.slice(0, 90),
    kind: draft?.kind ?? ((candidate.entityKindHint as EntityKind) || "evidence"),
    typeLabel: draft?.typeLabel ?? "Source-linked record",
    summary: draft?.summary ?? "",
    specialties: draft?.specialties ?? [],
    useCases: draft?.useCases ?? [],
    modalities: draft?.modalities ?? [],
    stages: draft?.stages ?? [],
    geography: draft?.geography ?? "Global",
    maturity: draft?.maturity ?? "Published",
  };
}

/**
 * Builds the catalog record an editor approved, validated against the same
 * schema the test suite enforces on data/catalog.json. Returns the problems
 * instead of writing anything when it doesn't validate.
 */
export function buildRecord(
  candidate: ReviewCandidate,
  fields: ReviewFields,
  existingSlugs: Set<string>,
  today = new Date().toISOString().slice(0, 10),
): { record: CatalogEntity } | { problems: string[] } {
  const base = slugify(fields.name) || "record";
  let slug = base;
  for (let attempt = 2; existingSlugs.has(slug); attempt += 1) slug = `${base}-${attempt}`;

  const record = {
    id: `${fields.kind}-${slug}`.slice(0, 60),
    slug,
    name: fields.name.trim(),
    kind: fields.kind,
    typeLabel: fields.typeLabel.trim(),
    summary: fields.summary.trim(),
    modalities: fields.modalities,
    specialties: fields.specialties,
    useCases: fields.useCases,
    geography: fields.geography.trim() || "Global",
    stage: fields.maturity.trim() || "Published",
    reviewStatus: "metadata-reviewed" as const,
    claimStatus: fields.kind === "evidence" ? ("not-claimable" as const) : ("unclaimed" as const),
    // The draft came from a model; an editor approved it. Both are shown.
    aiAssisted: true,
    lastReviewed: today,
    sourceUrl: candidate.sourceUrl,
    sourceLabel: candidate.sourceLabel,
    sourceNote: `Citation metadata retrieved from ${candidate.sourceLabel}; summary drafted by AI from that metadata and approved by an editor.`,
    accent: accents[fields.kind],
    relatedSlugs: [],
    ...(fields.stages.length > 0 ? { stages: fields.stages } : {}),
  };

  const parsed = catalogEntitySchema.safeParse(record);
  if (!parsed.success) {
    return { problems: parsed.error.issues.map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`) };
  }
  return { record: parsed.data as CatalogEntity };
}
