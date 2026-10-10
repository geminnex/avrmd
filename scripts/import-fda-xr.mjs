// Refreshes data/fda-xr-devices.json from the FDA's public list of
// authorized medical devices that use augmented or virtual reality.
//
//   node scripts/import-fda-xr.mjs
//
// The FDA list is the source of truth: rows are copied as published, never
// rewritten. The daily discovery robot calls refreshFdaXrDevices() too.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceUrl =
  "https://www.fda.gov/medical-devices/digital-health-center-excellence/augmented-reality-and-virtual-reality-medical-devices";
const outFile = resolve(import.meta.dirname, "..", "data", "fda-xr-devices.json");

const decode = (value) =>
  value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

function fdaUrl(submission) {
  if (submission.startsWith("DEN")) {
    return `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm?ID=${submission}`;
  }
  if (submission.startsWith("P")) {
    return `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=${submission}`;
  }
  return `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${submission}`;
}

/**
 * Fetches the FDA list and rewrites data/fda-xr-devices.json. Returns the
 * rows that were not in the previous file, so the robot can announce them.
 */
export async function refreshFdaXrDevices({ write = true, userAgent = "Mozilla/5.0 (AVRMD catalog import)" } = {}) {
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": userAgent },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`FDA page returned ${response.status}`);
  const html = await response.text();

  const updated = html.match(/Content current as of:[\s\S]*?(\d{2}\/\d{2}\/\d{4})/)?.[1] ?? null;

  const devices = [];
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(([, cell]) => decode(cell));
    if (cells.length !== 6 || !/^(K|DEN|P)\d/.test(cells[1])) continue;
    const [date, submission, name, company, panel, productCode] = cells;
    const [month, day, year] = date.split("/");
    devices.push({
      submission,
      name,
      company,
      panel,
      productCode,
      decisionDate: `${year}-${month}-${day}`,
      fdaUrl: fdaUrl(submission),
    });
  }
  // A layout change would otherwise silently empty the list.
  if (devices.length < 50) throw new Error(`Only ${devices.length} rows parsed — has the FDA page layout changed?`);

  let previous = null;
  try {
    previous = JSON.parse(await readFile(outFile, "utf8"));
  } catch {}
  const known = new Set((previous?.devices ?? []).map((device) => device.submission));
  // No previous file means a first import: nothing in it is news.
  const added = previous ? devices.filter((device) => !known.has(device.submission)) : [];

  devices.sort((a, b) => b.decisionDate.localeCompare(a.decisionDate) || a.submission.localeCompare(b.submission));

  const [m, d, y] = updated ? updated.split("/") : [];
  const sourceUpdated = updated ? `${y}-${m}-${d}` : null;
  if (write) {
    await writeFile(
      outFile,
      `${JSON.stringify(
        { sourceUrl, sourceUpdated, retrieved: new Date().toISOString().slice(0, 10), devices },
        null,
        2,
      )}\n`,
    );
  }
  return { sourceUrl, sourceUpdated, devices, added };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { devices, added, sourceUpdated } = await refreshFdaXrDevices();
  console.log(`${devices.length} devices (${added.length} new) · FDA page updated ${sourceUpdated ?? "unknown"}`);
}
