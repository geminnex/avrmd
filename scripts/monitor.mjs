// Hourly health check for AVRMD; emails the editors when something breaks
// and again when it recovers. Run by ~/.config/systemd/user/avrmd-monitor.timer.
//
//   node scripts/monitor.mjs            check and alert
//   node scripts/monitor.mjs --dry-run  check and print, send nothing
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import nodemailer from "nodemailer";
import pg from "pg";

const repo = resolve(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const statePath = join(homedir(), ".avrmd-monitor.json");
const backupDir = process.env.AVRMD_BACKUP_DIR ?? join(homedir(), "avrmd-backups");
const hour = 60 * 60 * 1000;

// The same files Next reads in production, later ones winning; real
// environment variables win over all of them.
function loadEnv() {
  const env = {};
  for (const file of [".env", ".env.production", ".env.production.local"]) {
    const path = join(repo, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
    }
  }
  return { ...env, ...process.env };
}
const env = loadEnv();

const checks = [];
const fail = (id, message) => checks.push({ id, ok: false, message });
const pass = (id, message) => checks.push({ id, ok: true, message });

// 1. The live site answers.
const site = env.AVRMD_LIVE_URL ?? "https://avrmd.cyalin.com";
for (const path of ["/", "/questions", "/clearances"]) {
  try {
    const response = await fetch(site + path, { signal: AbortSignal.timeout(15_000) });
    response.ok ? pass(`site${path}`, `${path} ${response.status}`) : fail(`site${path}`, `${site}${path} returned ${response.status}`);
  } catch (error) {
    fail(`site${path}`, `${site}${path} unreachable: ${error.message}`);
  }
}

// 2. The database answers.
try {
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  await client.query("select 1");
  await client.end();
  pass("database", "Postgres reachable");
} catch (error) {
  fail("database", `Postgres unreachable: ${error.message}`);
}

// 3. The discovery robot ran recently and its sources worked.
try {
  const log = JSON.parse(readFileSync(join(repo, "data", "discovery-log.json"), "utf8"));
  const age = Date.now() - new Date(log.lastRunAt).getTime();
  age < 26 * hour ? pass("robot-fresh", `robot ran ${Math.round(age / hour)}h ago`) : fail("robot-fresh", `discovery robot last ran ${Math.round(age / hour)}h ago`);
  const broken = (log.runs ?? []).filter((run) => run.error);
  broken.length === 0
    ? pass("robot-sources", "all sources fetched")
    : fail("robot-sources", `robot sources failing: ${broken.map((run) => `${run.source} (${run.error})`).join("; ")}`);
} catch (error) {
  fail("robot-fresh", `discovery log unreadable: ${error.message}`);
}

// 4. A backup was taken in the last day.
try {
  const dumps = readdirSync(backupDir).filter((name) => name.startsWith("db-") && name.endsWith(".dump"));
  const newest = Math.max(...dumps.map((name) => statSync(join(backupDir, name)).mtimeMs));
  dumps.length && Date.now() - newest < 26 * hour
    ? pass("backup", `latest backup ${Math.round((Date.now() - newest) / hour)}h old`)
    : fail("backup", dumps.length ? `latest backup is ${Math.round((Date.now() - newest) / hour)}h old` : "no backups found");
} catch (error) {
  fail("backup", `backup directory unreadable: ${error.message}`);
}

// 5. Disk space where the database, backups and site live.
try {
  const line = execFileSync("df", ["-P", repo], { encoding: "utf8" }).trim().split("\n")[1];
  const used = Number(line.split(/\s+/)[4].replace("%", ""));
  used < 90 ? pass("disk", `disk ${used}% used`) : fail("disk", `disk ${used}% full — Postgres stops when it fills`);
} catch (error) {
  fail("disk", `disk check failed: ${error.message}`);
}

// Alert on new or still-failing problems (at most once a day each) and on recovery.
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
const now = Date.now();
const failing = checks.filter((check) => !check.ok);
const newOrRepeat = failing.filter((check) => !state[check.id] || now - state[check.id] > 24 * hour);
const recovered = Object.keys(state).filter((id) => checks.some((check) => check.id === id && check.ok));

for (const check of checks) console.log(`${check.ok ? "ok  " : "FAIL"} ${check.message}`);

if (!dryRun && (newOrRepeat.length || recovered.length) && env.SMTP_HOST) {
  const to = env.EDITOR_EMAIL ?? env.SMTP_FROM?.match(/<([^>]+)>/)?.[1] ?? env.SMTP_FROM;
  const port = Number(env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465,
    requireTLS: Boolean(env.SMTP_USER) && port !== 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } : undefined,
  });
  const lines = [
    ...(newOrRepeat.length ? ["Problems:", ...newOrRepeat.map((check) => `- ${check.message}`), ""] : []),
    ...(recovered.length ? ["Recovered:", ...recovered.map((id) => `- ${checks.find((check) => check.id === id).message}`), ""] : []),
    "All checks:",
    ...checks.map((check) => `${check.ok ? "ok  " : "FAIL"} ${check.message}`),
  ];
  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: newOrRepeat.length ? `AVRMD alert: ${newOrRepeat.map((check) => check.id).join(", ")}` : "AVRMD recovered",
    text: lines.join("\n"),
  });
  console.log(`alert sent to ${to}`);
}

if (!dryRun) {
  const next = {};
  for (const check of failing) next[check.id] = newOrRepeat.includes(check) ? now : state[check.id];
  writeFileSync(statePath, JSON.stringify(next));
}
process.exitCode = failing.length ? 1 : 0;
