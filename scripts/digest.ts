// Weekly digest: what changed in the member's corner of medical XR.
//
//   node_modules/.bin/tsx --tsconfig tsconfig.json scripts/digest.ts [--dry-run] [--only=email]
//
// Run weekly by ~/.config/systemd/user/avrmd-digest.timer. Sends nothing to
// members with nothing new, or with the digest turned off.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repo = resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=")));
const dryRun = "dry-run" in args;
const week = 7 * 24 * 60 * 60 * 1000;

// Same env files Next reads in production; later files win, real env wins.
const fromFiles: Record<string, string> = {};
for (const file of [".env", ".env.production", ".env.production.local"]) {
  const path = join(repo, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) fromFiles[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
}
for (const [key, value] of Object.entries(fromFiles)) if (process.env[key] === undefined) process.env[key] = value;
process.chdir(repo);

async function main() {
  const { isNotNull } = await import("drizzle-orm");
  const { getDatabase, closeDatabase } = await import("../lib/db/client");
  const { users } = await import("../lib/db/schema");
  const { listQuestions } = await import("../lib/db/repositories/questions");
  const { getSignals } = await import("../lib/signals");
  const { terms } = await import("../lib/assistant/retrieve");
  const { readMemberProfile } = await import("../lib/db/repositories/users");
  const { stageLabels } = await import("../lib/stages");
  const { topics } = await import("../lib/topics");
  const { sendMail } = await import("../lib/mail");
  const { unsubscribeHeaders, unsubscribeUrl } = await import("../lib/email-prefs");
  const base = process.env.AUTH_URL ?? "https://avrmd.cyalin.com";

  // Every digest carries an unsubscribe link; if the live site can't serve
  // that page yet (code not deployed), send nothing rather than a dead link.
  if (!dryRun) {
    const probe = await fetch(`${base}/unsubscribe`, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
    if (!probe?.ok) {
      console.log(`digest: skipped — ${base}/unsubscribe is not live (${probe?.status ?? "unreachable"})`);
      await closeDatabase();
      return;
    }
  }

  const since = Date.now() - week;
  const recentSignals = getSignals().filter((signal) => new Date(signal.discoveredAt).getTime() >= since);
  const newDevices = recentSignals.filter((signal) => signal.sourceId === "fda-xr-device-list");
  const research = recentSignals.filter((signal) => signal.category === "research" || signal.category === "trial");
  const recentQuestions = (await listQuestions()).filter((question) => question.createdAt.getTime() >= since);

  const members = await getDatabase().select().from(users).where(isNotNull(users.emailVerifiedAt));
  let sent = 0;
  for (const member of members) {
    if (args.only && member.email !== args.only) continue;
    if (member.emailPrefs?.digest === false) continue;
    const profile = readMemberProfile(member);

    // Interests in words: what they help with, their stages, their topics.
    const interest = new Set(
      terms(
        [
          ...profile.canHelpWith,
          ...profile.stages.map((stage) => stageLabels[stage]),
          ...profile.topicInterests.map((slug) => topics.find((topic) => topic.slug === slug)?.name ?? ""),
        ].join(" "),
      ),
    );
    const score = (text: string) => terms(text).filter((term) => interest.has(term)).length;
    const papers = [...research]
      .sort((a, b) => score(b.headline) - score(a.headline) || b.discoveredAt.localeCompare(a.discoveredAt))
      .slice(0, 5);
    const forYou = recentQuestions
      .filter((question) => question.author.id !== member.id)
      .filter((question) => question.facets.some((name) => profile.canHelpWith.includes(name)) || question.answerCount === 0)
      .slice(0, 5);

    if (newDevices.length === 0 && papers.length === 0 && forYou.length === 0) continue;

    const lines: string[] = ["Here is what changed on AVRMD this week.", ""];
    if (forYou.length) {
      lines.push("QUESTIONS YOU COULD ANSWER");
      for (const question of forYou) lines.push(`- ${question.title}`, `  ${base}/questions/${question.id}`);
      lines.push("");
    }
    if (newDevices.length) {
      lines.push("NEW FDA AR/VR AUTHORIZATIONS");
      for (const device of newDevices.slice(0, 5)) lines.push(`- ${device.headline}`, `  ${device.url}`);
      lines.push("");
    }
    if (papers.length) {
      lines.push(interest.size ? "PAPERS AND TRIALS CLOSEST TO YOUR WORK" : "NEW PAPERS AND TRIALS");
      for (const paper of papers) lines.push(`- ${paper.headline} (${paper.sourceLabel})`, `  ${paper.url}`);
      lines.push("");
    }
    if (!interest.size) lines.push(`Tell us what you work on and the digest gets more specific: ${base}/settings/profile`);

    if (dryRun) {
      console.log(`--- ${member.email}\n${lines.join("\n")}`);
      continue;
    }
    const ok = await sendMail({
      to: member.email,
      subject: "This week in medical XR — AVRMD",
      lines,
      headers: unsubscribeHeaders(member.id, "digest"),
      footer: [
        "You get this weekly digest because you have an AVRMD account.",
        `Stop the digest: ${unsubscribeUrl(member.id, "digest")}`,
        `All email settings: ${base}/settings/profile#email`,
      ],
    });
    if (ok) sent += 1;
  }
  console.log(`digest: ${sent} sent${dryRun ? " (dry run)" : ""}, ${members.length} confirmed members`);
  await closeDatabase();
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
