import { entityKinds, pipelineStages, type EntityKind } from "./catalog-types";
import { modalities, specialties, useCases } from "./catalog";
import { topics } from "./topics";

/**
 * AI triage of the discovery queue. The robot finds hundreds of papers,
 * trials and filings; most belong in the signals feed, not the catalog. A
 * model sorts each into: worth a record (with a draft for an editor),
 * signal only, or off topic — so an editor reads a short list instead of
 * the whole queue. Nothing is published by triage; approval stays human.
 */
export type Recommendation = "add_record" | "signal_only" | "off_topic";

export type TriageDraft = {
  name: string;
  kind: EntityKind;
  typeLabel: string;
  summary: string;
  specialties: string[];
  useCases: string[];
  modalities: string[];
  stages: string[];
  topicSlugs: string[];
  geography: string;
  maturity: string;
};

export type Triage = {
  recommendation: Recommendation;
  confidence: number;
  reason: string;
  draft?: TriageDraft;
  model: string;
  at: string;
};

export type TriageInput = {
  id: string;
  title: string;
  sourceLabel: string;
  sourceId: string;
  published: string | null;
  raw?: Record<string, unknown>;
};

export const triagePromptVersion = "triage-2026-10-10";

const topicSlugs = topics.map((topic) => topic.slug);

export function buildTriageMessages(batch: TriageInput[]) {
  const system = `You triage a discovery queue for AVRMD, a curated catalog of medical virtual, augmented and mixed reality (XR). Each item is a paper, clinical trial, regulatory filing or news headline found automatically.

For each item choose one recommendation:
- "add_record": deserves its own catalog page. Only: systematic reviews or meta-analyses of XR in medicine; randomized or multicenter trials of an XR intervention; FDA-cleared XR devices; a new XR product, company, platform or major research program.
- "signal_only": relevant to medical XR but routine (single-site or pilot studies, protocols, feasibility work, narrow technical papers, minor updates). It stays in the news feed.
- "off_topic": not about XR used in health, medicine or medical education.

Only choose "add_record" when VR, AR, MR or XR is clearly the subject of the item itself. If the title does not make XR the subject (for example "digital interventions" or "simulation" in general), choose "signal_only" or "off_topic" instead.

For "add_record" also draft the record, using ONLY what the title and metadata state — never invent results, numbers, institutions or claims. Pick values only from these lists, and leave a list empty when nothing fits:
kinds: ${entityKinds.join(", ")}
specialties: ${specialties.join("; ")}
useCases: ${useCases.join("; ")}
modalities: ${modalities.join(", ")}
stages: ${pipelineStages.join(", ")}
topicSlugs: ${topicSlugs.join(", ")}
The summary is one or two plain sentences (max 40 words) saying what the item is and studies or offers. "name" is a short record name (max 90 characters). "typeLabel" is like "Systematic review", "Randomized controlled trial", "Clinical trial", "FDA 510(k) device". "maturity" is like "Published", "Recruiting", "Completed", "Cleared". "geography" is "Global" unless the metadata names a country.

Reply with JSON only: {"items":[{"id": string, "recommendation": string, "confidence": number 0-1, "reason": string (max 15 words), "draft"?: {...}}]} — one entry per input id.`;

  const user = batch
    .map((item) =>
      JSON.stringify({
        id: item.id,
        title: item.title,
        source: item.sourceLabel,
        feed: item.sourceId,
        published: item.published,
        details: item.raw ?? {},
      }),
    )
    .join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

const pick = (values: unknown, allowed: readonly string[], max: number) =>
  Array.isArray(values)
    ? [...new Set(values.filter((value): value is string => typeof value === "string" && allowed.includes(value)))].slice(0, max)
    : [];

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/**
 * Keeps only well-formed triage for ids that were asked about, with every
 * draft value checked against the site's vocabularies. A malformed draft
 * downgrades the item to "needs a human look" rather than inventing fields.
 */
export function validateTriage(raw: unknown, batch: TriageInput[], model: string, at = new Date().toISOString()) {
  const asked = new Set(batch.map((item) => item.id));
  const result = new Map<string, Triage>();
  const items = (raw as { items?: unknown })?.items;
  if (!Array.isArray(items)) return result;

  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const value = entry as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id : "";
    if (!asked.has(id) || result.has(id)) continue;
    const recommendation = value.recommendation;
    if (recommendation !== "add_record" && recommendation !== "signal_only" && recommendation !== "off_topic") continue;
    const confidence = typeof value.confidence === "number" ? Math.min(1, Math.max(0, value.confidence)) : 0.5;
    const triage: Triage = { recommendation, confidence, reason: text(value.reason, 140), model, at };

    if (recommendation === "add_record") {
      const draft = (value.draft ?? {}) as Record<string, unknown>;
      const kind = (entityKinds as readonly string[]).includes(draft.kind as string) ? (draft.kind as EntityKind) : null;
      const name = text(draft.name, 90);
      const summary = text(draft.summary, 320);
      if (kind && name && summary.length >= 20) {
        triage.draft = {
          name,
          kind,
          typeLabel: text(draft.typeLabel, 60) || "Record",
          summary,
          specialties: pick(draft.specialties, specialties, 4),
          useCases: pick(draft.useCases, useCases, 4),
          modalities: pick(draft.modalities, modalities, 3),
          stages: pick(draft.stages, pipelineStages, 3),
          topicSlugs: pick(draft.topicSlugs, topicSlugs, 2),
          geography: text(draft.geography, 60) || "Global",
          maturity: text(draft.maturity, 40) || "Published",
        };
      } else {
        // Recommended, but the draft is unusable: an editor drafts it.
        triage.confidence = Math.min(triage.confidence, 0.4);
        triage.reason = `${triage.reason} (draft incomplete)`.trim();
      }
    }
    result.set(id, triage);
  }
  return result;
}
