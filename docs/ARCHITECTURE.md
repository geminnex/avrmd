# Technical Architecture

How AVRMD is built today. Anything not listed here is not built.

## Stack

- Next.js 16 (App Router), React 19, TypeScript.
- PostgreSQL 17 (Docker, local) with Drizzle ORM; migrations in `drizzle/`, applied by `drizzle-kit migrate`.
- MinIO (S3 API, `@aws-sdk/client-s3`) for member uploads; file types are allowlisted in `lib/storage.ts` (no SVG). Uploads are served from `/media`.
- nodemailer over SMTP: Mailpit locally, Purelymail in production (`lib/mail.ts`).
- OpenRouter for the assistant and for candidate triage (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`).
- Tests: Vitest. Local services: `docker-compose.yml` (postgres, minio, mailpit).

## Production

- One VM. `next start` runs under systemd (`avrmd.service`) behind Caddy.
- `scripts/deploy.sh`:
  - `prepare`: commits editor approvals and the FDA refresh, installs, typechecks, tests, migrates, builds into `.next-release` (via `NEXT_DIST_DIR`), smoke-tests on a spare port. Touches nothing live.
  - `activate`: swaps the release in (previous build kept as `.next-prev`), restarts the service, checks key pages, swaps back on failure.
  - `rollback`: swaps `.next-prev` back in.
- `instrumentation.ts` checks environment variables at startup (`lib/env-check.ts`; warns, never refuses to start) and logs one line per unhandled server error to the journal.

## Authentication (custom, not Auth.js)

- Email and password: scrypt hashes (`lib/auth/password.ts`). New accounts confirm their email first.
- Google OAuth (`lib/auth/google.ts`, `app/api/auth/google`), offered only when both credentials are set.
- Emailed tokens live in `verification_tokens`, stored as SHA-256 hashes, with a `purpose`: `verify_email` (24 h), `reset_password` (30 min), `sign_in` (15 min; legacy magic link, no longer offered).
- Sessions are rows in `sessions` (hashed token, 30 days) behind an httpOnly, SameSite=Lax cookie. A password reset ends all of a user's sessions.
- Roles: `editor`, `moderator`, `administrator` count as staff (`lib/auth/roles.ts`).

## Request protection

- `proxy.ts`: state-changing `/api/*` requests carrying a foreign `Origin` get 403.
- `next.config.ts`: HSTS, nosniff, frame deny, referrer and permissions policies on every response; a first-party-only CSP in production builds.
- `lib/rate-limit.ts`: fixed-window limiter in the `rate_limits` table (atomic upsert); falls back to a per-process counter if the database is down.
- Page views (`/api/hit`) are daily per-path counters; no IP, cookie or user id is stored.

## Data split

Curated content is files, bundled at build.

- `data/catalog.json`, `facets.json`, `relations.json`, `talks.json`, `resources.json`, `sources.json`, `opportunities.json`, with topics and stages in `lib/topics.ts` and `lib/stages.ts`.
- Record, topic and stage pages are statically generated, so a content change reaches the site on the next deploy.

Robot output is files read at request time, so a daily run shows without a deploy.

- `data/signals.json` and `data/fda-xr-devices.json` via `lib/data-file.ts`; `data/candidates.json` via `lib/review-store.ts`.
- `seen.json` and `discovery-log.json` are the robot's own state.

PostgreSQL holds member and operational state.

- Accounts: `users`, `sessions`, `verification_tokens`.
- Social: `follows`, `posts`, `post_media`, `post_likes`, `post_comments`.
- Member talks: `talks`.
- Q&A: `questions`, `answers`, `notifications`.
- Contributions: `contributions` (kinds `submission`, `claim`, `advertising`, `inquiry` from the site forms; reviewed in `/workspace`).
- Record groups: `organization_memberships`, `community_threads`, `community_posts` (keyed by record slug).
- Assistant ledger: `ai_jobs`, `ai_runs`.
- Operations: `rate_limits`, `page_views`.

### Reserved, not yet used

These tables are in `lib/db/schema.ts` and migrated, but no application code reads or writes them:

- `entities`, `topics`, `entity_topics`, `entity_relations`: the catalog is in `data/*.json`. `lib/db/repositories/entities.ts` exists but nothing imports it.
- `source_records`, `field_provenance`, `content_revisions`.
- `catalog_submissions`, `ownership_claims`, `private_inquiries`: the site forms write to `contributions` instead.
- `campaigns`, `campaign_creatives`, `campaign_placements`, `delivery_events`: advertising is a file mirror in `lib/ads.ts` with no booked campaigns.
- `ai_suggestions`, `moderation_reports`, `audit_events`.

## Discovery robot and review

1. `scripts/discover.mjs` (daily): reads the allowlist in `data/sources.json`. Adapters: `fdaxrlist`, `pubmed`, `europepmc`, `openfda`, `clinicaltrials`, `rss` (Atom and RSS). It writes `signals.json`, refreshes the FDA device list, and queues `candidates.json`. It publishes nothing.
2. `scripts/triage-candidates.ts` (`lib/triage.ts`): a model sorts pending candidates, 20 per batch, into `add_record` (kept pending with a draft), `signal_only` or `off_topic` (dismissed by AI, reversible).
3. Editors review in `/workspace` (`lib/review.ts`, `lib/review-store.ts`, `app/api/workspace/*`). Approval appends to `catalog.json`; the record goes live on the next deploy.
4. `scripts/approve-candidate.mjs` is a command-line equivalent.

Steps 1 and 2 run daily (around midnight UTC) from the system timer `avrmd-discover.timer` (`/etc/systemd/system`, copied to `ops/systemd/` for reference). Its service has a 600-second timeout; triage runs inside it after discovery.

## Ask AVRMD assistant

- `app/api/assist` with `lib/assistant/{vocab,retrieve,actions,llm,engine}.ts`.
- Retrieval first: a corpus of public content (records, FDA devices, signals, talks, stages, topics, websites, questions) is matched against the query. The record, stage or topic page the visitor is on is pinned as the first source.
- The model, when called, may only cite source ids it was given and choose among actions the site generated; replies that fail validation are dropped.
- Model use is capped at 40 per visitor per day and `ASSISTANT_DAILY_LIMIT` (default 400) per rolling 24 h, counted from `ai_runs`.
- Without an API key, over a cap, or on any model failure, the answer is retrieval-only (sources and links, no generated text).

## Search

There is no Postgres full-text search or trigram index. What exists:

- Catalog explorer (`components/catalog-explorer.tsx`, `searchCatalog` in `lib/catalog.ts`): substring match over name, type, summary, owner, modalities, specialties and use cases, plus filters for kind, modality, specialty and stage.
- Assistant retrieval (`lib/assistant/retrieve.ts`): keyword and facet scoring over the corpus above.

## Operations

- Backups: `scripts/backup.sh`, nightly via user systemd timer (`ops/systemd/avrmd-backup.*`). Postgres custom-format dump, `data/` tarball and an incremental media mirror in `~/avrmd-backups`; 14 days kept. `--verify` restores the dump into a scratch database and counts rows; restore has been verified.
- Monitor: `scripts/monitor.mjs`, hourly user timer (`avrmd-monitor.*`). Checks the site, database, robot freshness, backup age and disk; emails editors on failure (at most daily per problem) and on recovery.
- Logs: `journalctl -u avrmd.service`.
