import { spawnSync } from "node:child_process";
import { access, copyFile, cp, mkdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const openNext = resolve(root, ".open-next");
const dist = resolve(root, "dist");
const server = resolve(dist, "server");
const client = resolve(dist, "client");
const wranglerBundle = resolve(root, ".sites-wrangler");

await access(resolve(openNext, "worker.js"), constants.R_OK);
await access(resolve(root, ".openai", "hosting.json"), constants.R_OK);

await rm(dist, { recursive: true, force: true });
await rm(wranglerBundle, { recursive: true, force: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });
await mkdir(server, { recursive: true });

// Sites uploads the artifact directly, so run Wrangler's production bundling
// pass first. This rewrites OpenNext's CommonJS Node imports for Workers.
const wrangler = spawnSync(
  resolve(root, "node_modules", ".bin", "wrangler"),
  ["deploy", "--dry-run", "--outdir", wranglerBundle],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: resolve(root, ".wrangler-sites.log"),
      WRANGLER_SEND_METRICS: "false",
    },
  },
);
if (wrangler.status !== 0) {
  throw new Error(`Wrangler bundling failed with exit code ${wrangler.status}`);
}
await copyFile(
  resolve(wranglerBundle, "worker.js"),
  resolve(server, "index.js"),
);

// Sites serves browser assets from dist/client and executes dist/server/index.js.
await cp(resolve(openNext, "assets"), client, { recursive: true });
await copyFile(
  resolve(root, ".openai", "hosting.json"),
  resolve(dist, ".openai", "hosting.json"),
);
await rm(wranglerBundle, { recursive: true, force: true });
await rm(resolve(root, ".wrangler-sites.log"), { force: true });

console.log("Packaged AVRMD for Sites in dist/");
