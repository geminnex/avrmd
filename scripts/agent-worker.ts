// The AI team's scheduled worker: assigns routine tasks to agents with
// auto-assign on, then runs whatever is queued. Run every 30 minutes by
// ~/.config/systemd/user/avrmd-agents.timer.
//
//   node_modules/.bin/tsx --tsconfig tsconfig.json scripts/agent-worker.ts
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repo = resolve(__dirname, "..");

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
  const { closeDatabase } = await import("../lib/db/client");
  const { autoAssignAgentTasks } = await import("../lib/agents/auto");
  const { runQueuedAgentTasks } = await import("../lib/agents/runner");
  const created = await autoAssignAgentTasks();
  const ran = await runQueuedAgentTasks(15);
  console.log(`agents: ${created} assigned, ${ran} run`);
  await closeDatabase();
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
