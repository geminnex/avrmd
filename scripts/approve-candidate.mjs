#!/usr/bin/env node
/**
 * Promotes a discovered candidate into the catalog after a human has read it.
 *
 *   node scripts/approve-candidate.mjs <candidateId> --slug=<slug> --name="…" \
 *     --kind=evidence --type-label="Peer-reviewed article" --summary="…" \
 *     [--specialties=a,b] [--use-cases=a,b] [--modalities=VR,AR] \
 *     [--geography=Global] [--stage=Published] [--accent=violet]
 *
 *   node scripts/approve-candidate.mjs <candidateId> --reject
 *
 * Every field the editor does not supply is left to a sensible default; the
 * record is validated before it is written, and nothing publishes until the
 * site is rebuilt.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");

const [candidateId, ...rest] = process.argv.slice(2);
if (!candidateId) {
  console.error("Usage: node scripts/approve-candidate.mjs <candidateId> [--reject] [--slug=…]");
  process.exit(1);
}

const flags = Object.fromEntries(
  rest
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, ...value] = arg.replace(/^--/, "").split("=");
      return [key, value.join("=") || true];
    }),
);

const read = (file) => JSON.parse(readFileSync(join(dataDir, file), "utf8"));
const write = (file, value) =>
  writeFileSync(join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`);

const candidates = read("candidates.json");
const candidate = candidates.find((item) => item.id === candidateId);
if (!candidate) {
  console.error(`No candidate with id ${candidateId}.`);
  process.exit(1);
}

if (flags.reject) {
  write(
    "candidates.json",
    candidates.map((item) =>
      item.id === candidateId
        ? { ...item, status: "rejected", decidedAt: new Date().toISOString() }
        : item,
    ),
  );
  console.log(`Rejected: ${candidate.title}`);
  process.exit(0);
}

const list = (value, fallback) =>
  typeof value === "string" && value.length > 0 ? value.split(",").map((s) => s.trim()) : fallback;

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

const catalog = read("catalog.json");
const slug = typeof flags.slug === "string" ? flags.slug : slugify(candidate.title);

if (catalog.some((entity) => entity.slug === slug)) {
  console.error(`Slug "${slug}" already exists. Pass a different --slug.`);
  process.exit(1);
}

const kind = typeof flags.kind === "string" ? flags.kind : candidate.entityKindHint || "evidence";
const record = {
  id: `${kind}-${slug}`.slice(0, 60),
  slug,
  name: typeof flags.name === "string" ? flags.name : candidate.title,
  kind,
  typeLabel:
    typeof flags["type-label"] === "string" ? flags["type-label"] : "Source-linked record",
  summary:
    typeof flags.summary === "string"
      ? flags.summary
      : `${candidate.title}. Metadata retrieved from ${candidate.sourceLabel}.`,
  modalities: list(flags.modalities, ["XR"]),
  specialties: list(flags.specialties, ["Cross-specialty"]),
  useCases: list(flags["use-cases"], ["Research"]),
  geography: typeof flags.geography === "string" ? flags.geography : "Global",
  stage: typeof flags.stage === "string" ? flags.stage : "Published",
  reviewStatus: "metadata-reviewed",
  claimStatus: kind === "evidence" ? "not-claimable" : "unclaimed",
  aiAssisted: false,
  lastReviewed: new Date().toISOString().slice(0, 10),
  sourceUrl: candidate.sourceUrl,
  sourceLabel: candidate.sourceLabel,
  sourceNote: `Citation metadata only, retrieved from ${candidate.sourceLabel}. ${candidate.rightsBasis}`,
  accent: typeof flags.accent === "string" ? flags.accent : "violet",
  relatedSlugs: [],
};

// Mirrors lib/catalog-schema.ts, which the test suite enforces on the whole
// file. Checked here too so a bad write never reaches the repository.
const problems = [];
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) problems.push("slug must be kebab-case");
if (!["organization", "solution", "evidence", "event", "project", "group"].includes(record.kind)) {
  problems.push(`unknown kind "${record.kind}"`);
}
if (!["teal", "blue", "violet", "coral", "gold"].includes(record.accent)) {
  problems.push(`unknown accent "${record.accent}"`);
}
if (!record.sourceUrl.startsWith("https://")) problems.push("sourceUrl must be https");
if (record.summary.length < 20) problems.push("summary is too short");
if (record.name.length < 2) problems.push("name is too short");

if (problems.length > 0) {
  console.error("Record failed validation:");
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}

write("catalog.json", [...catalog, record]);
write(
  "candidates.json",
  candidates.map((item) =>
    item.id === candidateId
      ? { ...item, status: "approved", decidedAt: new Date().toISOString(), slug }
      : item,
  ),
);

console.log(`Added /entities/${slug}`);
console.log("Run `next build` and restart avrmd.service to publish it.");
