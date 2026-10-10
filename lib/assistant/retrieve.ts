import { catalog, entityHref } from "../catalog";
import { facets } from "../facets";
import { getFdaDeviceList } from "../fda-devices";
import { resources } from "../resources";
import { getSignals } from "../signals";
import { stages } from "../stages";
import { topics } from "../topics";
import type { Talk } from "../talks";

/**
 * One searchable unit of AVRMD content, in the shape the assistant cites.
 * Everything here is already public on the site; nothing about members.
 */
export type CorpusItem = {
  /** Stable within one answer: what the model writes as [id]. */
  id: string;
  type: "record" | "fda" | "signal" | "talk" | "stage" | "topic" | "website" | "question";
  title: string;
  body: string;
  href: string;
  external: boolean;
  /** Shown beside the citation, e.g. "FDA · 2025-09-29". */
  meta: string;
};

export type QuestionDoc = { id: string; title: string; facets: string[]; answerCount: number };

const stopwords = new Set(
  "the and for with what which who how does are is was were can could should would about into from that this these those there their have has had any some our your you use used using xr vr ar mr virtual reality augmented mixed extended medical medicine".split(
    " ",
  ),
);

// Short clinical acronyms that would otherwise fall under the 3-letter minimum.
const acronyms = new Set(["ct", "pt", "ot", "ed", "er", "3d", "2d", "ui", "ux"]);

// Imaging words that should find records phrased in general terms.
const synonyms: Record<string, string[]> = {
  ct: ["imag"],
  mri: ["imag"],
  scan: ["imag"],
  dicom: ["imag"],
};

/**
 * A light stem so "surgical" and "surgery", "rehabilitate" and
 * "rehabilitation", "images" and "imaging" meet. Applied to both the
 * question and the content, then matched as word prefixes.
 */
function stem(word: string) {
  if (word.length <= 4) return word;
  for (const suffix of ["ically", "ation", "ical", "ing", "ery", "ies", "ive", "ate", "ed", "al", "es", "s", "e"]) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) return word.slice(0, -suffix.length);
  }
  return word;
}

/** Lowercased, stemmed content words. */
export function terms(text: string) {
  const words = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => (word.length >= 3 || acronyms.has(word)) && !stopwords.has(word));
  return [...new Set(words.flatMap((word) => [stem(word), ...(synonyms[word] ?? [])]))];
}

function score(item: Pick<CorpusItem, "title" | "body">, queryTerms: string[], distinctive: Set<string>) {
  if (queryTerms.length === 0) return 0;
  const title = ` ${terms(item.title).join(" ")} `;
  const body = ` ${terms(item.body).join(" ")} `;
  let total = 0;
  let matched = 0;
  for (const term of queryTerms) {
    const inTitle = title.includes(` ${term}`);
    const inBody = body.includes(` ${term}`);
    if (inTitle) total += 3;
    else if (inBody) total += 1;
    if (inTitle || inBody) matched += 1;
  }
  // Covering more of the question beats repeating one word.
  let result = total * (matched / queryTerms.length);
  // A distinctive name in the question (a product or company that appears in
  // only a few titles) is the strongest signal there is: "Is Smileyscope
  // cleared…" must find Smileyscope even if nothing else in it matches.
  if (queryTerms.some((term) => distinctive.has(term) && title.includes(` ${term}`))) result += 4;
  return result;
}

export function buildCorpus(extra: { talks?: Talk[]; questions?: QuestionDoc[] } = {}) {
  const items: Omit<CorpusItem, "id">[] = [];

  // An organization is also found by its products' names ("Who makes RelieVRx?").
  const productsOf = new Map<string, string[]>();
  for (const entity of catalog) {
    if (entity.owner) productsOf.set(entity.owner, [...(productsOf.get(entity.owner) ?? []), entity.name]);
  }
  for (const entity of catalog) {
    items.push({
      type: "record",
      title: entity.name,
      body: [
        entity.typeLabel,
        entity.summary,
        ...entity.specialties,
        ...entity.useCases,
        entity.owner ?? "",
        ...(entity.kind === "organization" ? (productsOf.get(entity.name) ?? []).map((name) => `makes ${name}`) : []),
      ].join(" "),
      href: entityHref(entity),
      external: false,
      meta: `AVRMD record · ${entity.typeLabel}`,
    });
  }
  for (const device of getFdaDeviceList().devices) {
    items.push({
      type: "fda",
      title: device.name,
      body: `${device.company} ${device.panel} FDA authorized AR VR medical device ${device.submission} clearance`,
      href: device.fdaUrl,
      external: true,
      meta: `FDA ${device.submission} · ${device.company} · ${device.decisionDate}`,
    });
  }
  for (const signal of getSignals()) {
    items.push({
      type: "signal",
      title: signal.headline,
      body: `${signal.sourceLabel} ${signal.category}`,
      href: signal.url,
      external: true,
      meta: `${signal.sourceLabel} · ${signal.discoveredAt.slice(0, 10)}`,
    });
  }
  for (const talk of extra.talks ?? []) {
    items.push({
      type: "talk",
      title: talk.title,
      body: [talk.hostLabel, ...talk.speakers, ...(talk.facets ?? []), ...(talk.stages ?? [])].join(" "),
      href: talk.url,
      external: true,
      meta: `Talk · ${talk.hostLabel}`,
    });
  }
  for (const stage of stages) {
    items.push({
      type: "stage",
      title: `${stage.name} stage`,
      body: `${stage.question} ${stage.description}`,
      href: `/stages/${stage.slug}`,
      external: false,
      meta: "AVRMD stage guide",
    });
  }
  for (const topic of topics) {
    items.push({
      type: "topic",
      title: topic.name,
      body: [topic.tagline, topic.intro, ...topic.specialties, ...topic.useCases].join(" "),
      href: `/topics/${topic.slug}`,
      external: false,
      meta: "AVRMD clinical topic",
    });
  }
  for (const resource of resources) {
    items.push({
      type: "website",
      title: resource.name,
      body: resource.description,
      href: resource.url,
      external: true,
      meta: "Related website",
    });
  }
  for (const question of extra.questions ?? []) {
    items.push({
      type: "question",
      title: question.title,
      body: question.facets.join(" "),
      href: `/questions/${question.id}`,
      external: false,
      meta: `Member question · ${question.answerCount} ${question.answerCount === 1 ? "answer" : "answers"}`,
    });
  }
  return items;
}

/** How many of one type may crowd the context, so one source can't drown the rest. */
const perTypeCap: Record<CorpusItem["type"], number> = {
  record: 5,
  fda: 4,
  signal: 4,
  talk: 3,
  stage: 2,
  topic: 2,
  website: 2,
  question: 3,
};

export function retrieve(
  query: string,
  corpus: Omit<CorpusItem, "id">[],
  options: { limit?: number; pinned?: Omit<CorpusItem, "id">[] } = {},
): CorpusItem[] {
  const queryTerms = terms(query);
  // Terms that appear in very few titles: names of products and companies.
  const titleFrequency = new Map<string, number>();
  for (const item of corpus) for (const term of terms(item.title)) titleFrequency.set(term, (titleFrequency.get(term) ?? 0) + 1);
  const distinctive = new Set(queryTerms.filter((term) => term.length >= 5 && (titleFrequency.get(term) ?? 0) <= 3));
  const used: Record<string, number> = {};
  const picked: Omit<CorpusItem, "id">[] = [...(options.pinned ?? [])];
  const seen = new Set(picked.map((item) => item.href));

  const ranked = corpus
    .map((item) => ({ item, score: score(item, queryTerms, distinctive) }))
    .filter((entry) => entry.score >= 1)
    .sort((a, b) => b.score - a.score);

  for (const { item } of ranked) {
    if (picked.length >= (options.limit ?? 12)) break;
    if (seen.has(item.href)) continue;
    if ((used[item.type] ?? 0) >= perTypeCap[item.type]) continue;
    used[item.type] = (used[item.type] ?? 0) + 1;
    seen.add(item.href);
    picked.push(item);
  }
  return picked.map((item, index) => ({ ...item, id: `s${index + 1}` }));
}

/**
 * Facets the question names, by name or alias — what routes and filters key
 * on. Modalities (VR, AR…) are left out: on this site nearly every question
 * names one, so as a filter they narrow nothing.
 */
export function detectFacets(query: string) {
  const text = ` ${query.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return facets
    .filter((facet) => facet.kind !== "modality")
    .filter((facet) =>
      [facet.name, ...(facet.aliases ?? [])].some((phrase) => {
        const needle = phrase.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        return text.includes(` ${needle} `) || text.includes(` ${needle}s `);
      }),
    )
    .map((facet) => facet.name);
}

export function detectStages(query: string) {
  const text = query.toLowerCase();
  const hints: Record<string, RegExp> = {
    research: /\bresearch|literature|study design\b/,
    technology: /\bhardware|software|sdk|engine|latency|tracking|haptic/,
    design: /\bdesign|prototype|usability|ux\b/,
    implementation: /\bimplement|deploy|rollout|adoption|hospital it|procure/,
    validation: /\bvalidat|clinical trial|rct\b|efficacy|outcome/,
    regulatory: /\bfda|510\(?k|de novo|regulat|clearance|ce mark|mdr\b|approval/,
    manufacturing: /\bmanufactur|supply chain|production/,
    commercialization: /\breimburs|pricing|sales|go-to-market|commerciali|business model|investor|funding/,
  };
  return stages.filter((stage) => hints[stage.slug]?.test(text)).map((stage) => stage.slug);
}
