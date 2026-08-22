#!/usr/bin/env node
/**
 * Daily check for records worth adding to the catalog.
 *
 * Collection is limited to the allowlisted sources in data/sources.json, and
 * nothing here publishes: candidates land in data/candidates.json for a human
 * to approve with scripts/approve-candidate.mjs.
 *
 *   node scripts/discover.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const dryRun = process.argv.includes("--dry-run");

const userAgent =
  "AVRMD-discovery/1.0 (+https://avrmd.cyalin.com; medical XR catalog curation)";

function readJson(file, fallback) {
  const path = join(dataDir, file);
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(file, value) {
  if (dryRun) return;
  writeFileSync(join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function fingerprint(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 16);
}

// ---------- source adapters ----------

async function fromPubmed(source) {
  const search = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  search.searchParams.set("db", "pubmed");
  search.searchParams.set("term", source.query);
  search.searchParams.set("retmode", "json");
  search.searchParams.set("retmax", String(source.limit));
  search.searchParams.set("sort", "date");
  search.searchParams.set("datetype", "pdat");
  if (source.recentDays) search.searchParams.set("reldate", String(source.recentDays));

  const ids = (await fetchJson(search)).esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  await sleep(400); // NCBI asks for no more than three requests a second.

  const summary = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
  summary.searchParams.set("db", "pubmed");
  summary.searchParams.set("id", ids.join(","));
  summary.searchParams.set("retmode", "json");

  const result = (await fetchJson(summary)).result ?? {};
  return ids
    .map((id) => result[id])
    .filter(Boolean)
    .map((item) => ({
      key: `pmid:${item.uid}`,
      title: item.title?.replace(/\.$/, "") ?? "Untitled",
      sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
      sourceLabel: item.fulljournalname || item.source || "PubMed",
      published: item.pubdate ?? null,
      raw: { pmid: item.uid, journal: item.source, authors: item.authors?.length ?? 0 },
    }));
}

async function fromEuropePmc(source) {
  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.searchParams.set("query", source.query);
  url.searchParams.set("format", "json");
  url.searchParams.set("pageSize", String(source.limit));
  url.searchParams.set("sort", "P_PDATE_D desc");

  const results = (await fetchJson(url)).resultList?.result ?? [];
  return results.map((item) => ({
    key: item.doi ? `doi:${item.doi}` : `epmc:${item.id}`,
    title: item.title?.replace(/\.$/, "") ?? "Untitled",
    sourceUrl: item.doi
      ? `https://doi.org/${item.doi}`
      : `https://europepmc.org/article/${item.source}/${item.id}`,
    sourceLabel: item.journalTitle || "Europe PMC",
    published: item.firstPublicationDate ?? null,
    raw: { doi: item.doi, pmid: item.pmid, isOpenAccess: item.isOpenAccess },
  }));
}

async function fromOpenFda(source) {
  const url =
    "https://api.fda.gov/device/510k.json?search=" +
    source.query +
    "&sort=decision_date:desc&limit=" +
    source.limit;

  let payload;
  try {
    payload = await fetchJson(url);
  } catch (error) {
    // openFDA answers an empty result set with 404.
    if (String(error).includes("404")) return [];
    throw error;
  }

  return (payload.results ?? []).map((item) => ({
    key: `k:${item.k_number}`,
    title: `${item.device_name} — ${item.k_number}`,
    sourceUrl: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${item.k_number}`,
    sourceLabel: "US Food and Drug Administration",
    published: item.decision_date ?? null,
    raw: {
      kNumber: item.k_number,
      applicant: item.applicant,
      decisionDate: item.decision_date,
      productCode: item.product_code,
    },
  }));
}

async function fromClinicalTrials(source) {
  const url = new URL("https://clinicaltrials.gov/api/v2/studies");
  url.searchParams.set("query.term", source.query);
  url.searchParams.set("pageSize", String(source.limit));
  url.searchParams.set("sort", "LastUpdatePostDate:desc");

  const studies = (await fetchJson(url)).studies ?? [];
  return studies.map((study) => {
    const id = study.protocolSection?.identificationModule ?? {};
    const status = study.protocolSection?.statusModule ?? {};
    return {
      key: `nct:${id.nctId}`,
      title: id.briefTitle ?? id.officialTitle ?? "Untitled study",
      sourceUrl: `https://clinicaltrials.gov/study/${id.nctId}`,
      sourceLabel: "ClinicalTrials.gov",
      published: status.lastUpdatePostDateStruct?.date ?? null,
      raw: {
        nctId: id.nctId,
        sponsor: id.organization?.fullName,
        overallStatus: status.overallStatus,
      },
    };
  });
}

async function fromRss(source) {
  const response = await fetch(source.feedUrl, {
    headers: { "User-Agent": userAgent },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const xml = await response.text();

  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/g)].slice(0, source.limit);
  const pick = (block, tag) => {
    const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    if (!match) return null;
    return match[1]
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();
  };

  return items
    .map((match) => match[0])
    .map((block) => {
      const link = pick(block, "link");
      if (!link) return null;
      return {
        key: `url:${fingerprint(link)}`,
        title: pick(block, "title") ?? "Untitled",
        sourceUrl: link,
        sourceLabel: source.label,
        published: pick(block, "pubDate"),
        raw: {},
      };
    })
    .filter(Boolean);
}

const adapters = {
  pubmed: fromPubmed,
  europepmc: fromEuropePmc,
  openfda: fromOpenFda,
  clinicaltrials: fromClinicalTrials,
  rss: fromRss,
};

// A signal is a headline, not a reviewed record, so it can auto-publish with
// no editor in the loop. This is the only place its category is decided.
const signalCategoryBySourceKind = {
  openfda: "regulatory",
  clinicaltrials: "trial",
  pubmed: "research",
  europepmc: "research",
  rss: "industry",
};

// ---------- run ----------

async function main() {
  const sources = readJson("sources.json", []).filter((source) => source.enabled);
  const catalog = readJson("catalog.json", []);
  const seen = new Set(readJson("seen.json", []));
  const candidates = readJson("candidates.json", []);

  // Records already in the catalog must never resurface as new.
  const known = new Set([
    ...seen,
    ...catalog.map((entity) => `url:${fingerprint(entity.sourceUrl)}`),
    ...catalog.flatMap((entity) => {
      const match = entity.sourceUrl.match(/K\d{6}/i);
      return match ? [`k:${match[0].toUpperCase()}`] : [];
    }),
  ]);
  for (const candidate of candidates) known.add(candidate.key);

  const startedAt = new Date().toISOString();
  const runs = [];
  const fresh = [];
  const freshSignals = [];

  for (const source of sources) {
    const adapter = adapters[source.kind];
    if (!adapter) {
      runs.push({ source: source.id, error: `no adapter for ${source.kind}` });
      continue;
    }

    try {
      const items = await adapter(source);
      let added = 0;

      for (const item of items) {
        const key = item.key ?? `url:${fingerprint(item.sourceUrl)}`;
        if (known.has(key)) continue;
        known.add(key);
        added += 1;
        fresh.push({
          id: fingerprint(`${key}:${startedAt}`),
          key,
          status: "pending",
          discoveredAt: startedAt,
          sourceId: source.id,
          entityKindHint: source.entityKindHint,
          rightsBasis: source.rightsBasis,
          title: item.title,
          sourceUrl: item.sourceUrl,
          sourceLabel: item.sourceLabel,
          published: item.published,
          raw: item.raw ?? {},
        });
        freshSignals.push({
          id: fingerprint(`signal:${key}`),
          headline: item.title,
          url: item.sourceUrl,
          sourceLabel: item.sourceLabel,
          category: signalCategoryBySourceKind[source.kind] ?? "industry",
          publishedAt: item.published ?? null,
          discoveredAt: startedAt,
          sourceId: source.id,
        });
      }

      runs.push({ source: source.id, fetched: items.length, added });
      console.log(`${source.id}: ${items.length} fetched, ${added} new`);
    } catch (error) {
      runs.push({ source: source.id, error: String(error?.message ?? error) });
      console.error(`${source.id}: ${error?.message ?? error}`);
    }

    await sleep(600);
  }

  const log = {
    lastRunAt: startedAt,
    dryRun,
    totalNew: fresh.length,
    runs,
  };

  // Signals are a feed, not an archive: keep the most recent slice so the
  // file doesn't grow without bound.
  const signals = readJson("signals.json", []);
  const signalCap = 400;

  writeJson("candidates.json", [...fresh, ...candidates]);
  writeJson("seen.json", [...known]);
  writeJson("discovery-log.json", log);
  writeJson(
    "signals.json",
    [...freshSignals, ...signals]
      .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt))
      .slice(0, signalCap),
  );

  console.log(
    `${dryRun ? "[dry run] " : ""}${fresh.length} new candidate(s); ${candidates.length} already pending; ${freshSignals.length} new signal(s).`,
  );
}

await main();
