# AVRMD Implementation Checklist

> ⚠️ **Iron rule: everything on the site and in `docs/` is English.** UI text, buttons, page titles, record content, error messages, and emails are all English. Chinese is only used in conversation.

North star: **the largest, most complete medical XR community**, where clinicians, researchers, engineers, device makers, manufacturers and business people find direction, resources and help; ending in an AVRMD annual meeting. The way there is an **online, always-on conference**, kept simple and **assistant-first**.
Context: [Product Vision](PRODUCT_VISION.md) · [Market Study](MARKET_STUDY.md) · **[Full review 2026-10-10](REVIEW_2026-10-10.md)**, which drives Phases 5–11 below.

---

## Phase 0 — Get it into the repo first ✅ Done

- [x] Check for secret leaks (`.env` not tracked, no hardcoded passwords)
- [x] Commit: Groups feature (forum / Blog / media)
- [x] Commit: catalog expanded to 49 records + 8-stage schema + two documents
- [x] Push to GitHub (`geminnex/avrmd`)

---

## Phase 1 — Stage dimension (the conference "program") ✅ Done

Make "which gate am I stuck at" a browsable, filterable second axis.

**Data**
- [x] Fill in `stages` for the remaining 33 records (currently only 16 of 49 have it)
- [x] Relax `problem` records: clinical problems attach to a topic, technical problems attach to a stage (one or the other)
- [x] Update the `lib/topics.test.ts` coverage guard to support technical problems
- [x] Add 5 technical problems (R&D obstacles, software and hardware), each with a real paper as source
  - [x] Hand-tracking accuracy (fine surgical movements)
  - [x] Haptic feedback fidelity (tissue feel)
  - [x] AR registration error (overlay onto patient anatomy)
  - [x] Latency and motion sickness
  - [ ] Hardware limits in the sterile field (not included: no verifiable source found)
  - [x] DICOM → real-time 3D performance bottleneck
  - [x] Cross-headset porting cost (fragmented OpenXR ecosystem)

**UI (all English)**
- [x] `/stages` — overview of the eight stages
- [x] `/stages/[slug]` — stage guide page (question + description + records for that stage + technical problems)
- [x] Add stage filter to `/explore`
- [x] **Extra**: build `/problems/[slug]` (previously referenced but never built, causing dead links)
- [x] **Extra**: shared `entityHref()` function, so routing rules are not hardcoded everywhere
- [x] **Extra**: the old `stage` field is relabeled Maturity in the UI, to separate it from pipeline stage
- [x] Record pages get stage chips → link to `/stages/[slug]`

---

## Phase 2 — Talks (the conference "talks") ✅ Done

- [x] `data/talks.json` — 54 real public talks (MedVR Online Talks, individual URL for each, 54/54 curl returned 200)
- [x] `lib/talks.ts` — merges two sources (curated JSON + member submissions in Postgres); still serves curated only if the DB is down
- [x] `talks` table + migration (`drizzle/0006_member_talks.sql`, applied)
- [x] `/talks` — filterable by tag (reuses the 59 facets + 8 stages + clinical topics, **no new classification system added**)
- [x] **Homepage rotates talks randomly as the headline** (force-dynamic, re-drawn on every visit)
- [x] `POST /api/talks` — member submission (rate limit, tags must be within the existing vocabulary, duplicate URL returns 409)
- [x] `TalkSubmitForm` client island — does not break static generation
- [x] Visually distinct from "reviewed records" (dashed `.talk-card`)
- [x] **Extra**: remove For organizations from Header nav (seven items wrapped onto a second line; still reachable from footer / mobile / homepage CTA)

---

## Phase 3 — Profiles and member directory (the "attendee roster") ✅ Done

- [x] Extend `users` table: `roles`, `stages`, `canHelpWith`, `lookingFor`, `topicInterests`, `affiliationSlug` (`drizzle/0007_member_profile_fields.sql`, applied)
- [x] `lib/member-profile.ts` — 8 professional roles (kept separate from the DB's `memberRole` permission enum) + matching / scoring logic
- [x] Extend `/settings/profile` with editing fields
- [x] `components/tag-picker.tsx` — chips for small option sets, a searchable list for the 59 facets
- [x] `/members/[handle]` shows roles, stages, and what they can help with (every tag links back to its page)
- [x] `/members` member directory — filter by role / stage / expertise / clinical topic (this is "find partners")
- [x] **Privacy**: members who have not filled in a role or stage are not listed in the directory (filling in is the opt-in)
- [x] API rejects declarations outside the existing vocabulary; affiliation must be an existing organization record
- [x] When the DB is down, the directory shows an honest error state instead of crashing the whole site
- [x] **Extra**: rename Header nav `/explore` to Records (semantic clash with the Members directory)
- [x] **Extra**: hide the brand subtitle at ≤1400px, fixing the seven nav items crowding the Ask button

---

## Phase 4 — Questions and routing (the "hallway conversations") ✅ Done (except Email)

- [x] `questions`, `answers`, `notifications` tables (`drizzle/0008_questions_and_notifications.sql`, applied)
- [x] `/ask` — ask a question and tag topic / stage / technology (static page + client island; supports `?facet=` / `?stage=` / `?topic=` preselection)
- [x] `/questions` (filters: unanswered, stage, clinical area, tag, **Matched to me**), `/questions/[id]` (answer, asker marks "This helped")
- [x] **Routing**: when a question is asked, match against `canHelpWith` → write notifications (`lib/questions.ts`, tested)
  - Only notify people who "declared they can help with that facet"; same stage / clinical interest only affects ranking and is not grounds for a notification
  - At most 8 people notified per question; each person receives at most 5 routed notifications per 24 hours (avoids fatigue)
  - Notifications record "why you received this" (Matched on …), so the recipient can see which declaration triggered it
  - While asking, show "will notify N members" in real time, so users know the facet is the key to reaching people
- [x] Answer → notify the asker; marked helpful → notify the answerer (unique constraint prevents duplicates)
- [x] Header notification bell (merged into the AccountSlot island, `/api/auth/me` also returns the unread count, refreshed when switching back to the tab)
- [x] `/notifications` — opening it marks everything as read
- [x] **Extra**: Header nav Community → Questions (the Community page is still all sample discussions; added a link pointing to the real Q&A)
- [ ] ⛔ Email notifications are **blocked on you providing production SMTP credentials** (only local Mailpit for now); unsubscribe / notification preferences also need to be built first

---

## Interim work (2026-10-10) ✅ Done

- [x] Production email through Purelymail; magic links never shown on screen in production
- [x] Daily robot: FDA AR/VR device list (`/clearances`, 120 devices), arXiv, JMIR XR, JMIR Serious Games, Frontiers in VR, Auganix, alongside PubMed, Europe PMC, openFDA, ClinicalTrials.gov — 10 sources
- [x] Robot output read at request time, so each run reaches the live site without a deploy
- [x] Ask AVRMD answers from site sources with citations and site-generated next steps (OpenRouter, Claude Haiku 5.5, daily cap, retrieval-only fallback)
- [x] All docs in English

---

## Phase 5 — Trust and safety (stop promising what the site doesn't do)

Nothing new is built until the site stops discarding input and the security mediums are closed.

**Added during Phase 5 (owner request)**
- [x] Sign-in rewritten: email + password with email confirmation (the email is the account), Google sign-in, forgot/reset password; scrypt hashes; enumeration-safe responses; pre-hijacking closed; rate limits

**Owner actions (need sudo)**
- [ ] Remove the `OPENROUTER_*` lines from `/etc/avrmd.env` and restart (the live assistant is retrieval-only until then)
- [ ] Add the sudoers rule allowing `systemctl restart avrmd.service`, so deploys don't wait on a person
- [ ] Decide where off-site backups go (another host, S3-compatible bucket, or Google Drive)
- [ ] Create a Google OAuth client and put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env.production.local` (the Google button appears once both are set)
- [ ] Supply the legal entity, governing law and public contact address (`CONTACT_EMAIL`) for `/privacy` and `/terms`
- [ ] Free disk space: `/home` is 97% full (4.9 GB left) — a full disk stops Postgres and the site

**Forms and claims**
- [x] Every form real: suggestion, claim and promotion enquiry are stored (`contributions`) and emailed to the editors with reply-to; private messages go to a record's verified representatives or are refused; the AI-job form is removed (`/ai` → `/about#ai`). Signed-in members only
- [x] Signed-out visitors see a sign-in prompt in place of a form, before typing
- [x] `/about` "What is live today" rewritten from the code
- [x] Over-promising copy fixed on `/for-organizations`, `/participate`, `/opportunities`, `/sign-in`

**Security (from the review)**
- [x] M1 Security headers in `next.config.ts`: CSP, HSTS, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy
- [x] M2 Media bucket: GetObject only, no anonymous listing; upload keys without user ids
- [x] M3 Neutral generated handles (never from the email address); reserved handles
- [x] M4 Post media restricted to the member's own uploads
- [x] M6 Magic link: a confirm page that POSTs; atomic `UPDATE … RETURNING` consumption
- [x] L1 Validate ids everywhere: a malformed id is a 404, never a 500
- [x] L3 Origin check on state-changing routes (sign-out included)

**Legal and data**
- [x] Privacy policy and terms with copyright takedown procedure (`/privacy`, `/terms`) — legal entity, governing law and contact address still to be supplied by the owner
- [x] Account deletion from settings (rows and uploaded images)
- [x] Nightly `pg_dump`, `data/` and media mirror to `~/avrmd-backups`, 14 days, restore verified (user systemd timer)
- [ ] Off-site copy of the backups (waits on the owner's choice of destination)

---

## Phase 6 — Operations (deploys that can't break the live site) ✅ Done

- [x] `scripts/deploy.sh prepare | activate | rollback`: build into `.next-release`, smoke-test 12 routes on a spare port, swap with `.next-prev` kept, restart, live check, automatic rollback on failure
- [x] Dead Cloudflare/OpenNext path and `output: "standalone"` removed; `latest` dependency pins fixed to installed versions
- [x] Robot writes atomically (temp file + rename). Robot data stays in `data/` (`fda-xr-devices.json` tracked as a public-data snapshot; the rest gitignored and backed up nightly)
- [x] Postgres-backed rate limiter for every limited route (atomic; parallel bursts can't overshoot); limits added to 11 unprotected routes; per-visitor assistant quota (review M5)
- [x] Startup configuration check in `instrumentation.ts` (logs missing, empty-override and suspicious settings) and one log line per unhandled server error
- [x] `app/error.tsx` for any failing page (DB down included); `/network` likes in one query
- [x] Hourly health check with email alerts (site, Postgres, robot freshness and sources, backup age, disk) — `scripts/monitor.mjs`, user systemd timer
- [x] Duplicated helpers unified (`lib/time.ts`, `lib/url.ts`)

---

## Phase 7 — Simplify, assistant first ✅ Done (live 2026-10-11)

The owner's direction: not complex; don't make people fish in an ocean; the assistant brings in the right link or feature at the right moment.

- [x] Home page: one ask box with role chips (clinician, researcher, engineer, industry) opening Ask AVRMD; below it, new FDA authorizations, latest papers and trials, member questions
- [x] Navigation cut to five: **Library · Stages · Talks · People · For organizations** (+ Ask AVRMD). Library and People are tab bars across their pages; mobile menu and footer follow
- [x] `/community` (samples) redirects to `/questions`; sample threads removed from topic pages and the home feed; `/workspace` editors only; `/opportunities` out of menus and noindexed
- [x] Stages are a primary nav item; clinical topics live under Library and as assistant/question context
- [x] When nobody has offered help, the assistant offers "Post this as a question to the community"
- [x] `robots.txt`, `sitemap.xml` (84 URLs); cookie-free page-view counts per page per day (DNT/GPC honoured)
- [x] Home page static again (ISR, 5 minutes)

---

## Phase 8 — Content engine ("most complete") ✅ Done (live 2026-10-11)

- [x] AI triage of the review queue (`scripts/triage-candidates.ts`, runs after every robot pass): add a record / signal only / off topic, with a vocabulary-checked draft. First run: 761 → 106 to review, 655 set aside (reversible), about US$0.06
- [x] Review screen in `/workspace` (editors only): edit the AI draft, approve (schema-validated record written to the catalog), reject, restore set-aside items; contributions with Done / Decline. The owner's account is an administrator
- [x] Coverage numbers on `/about` (records by kind, FDA devices, feed size, talks, sources, last robot run)
- [x] Problem records for the Regulatory (3) and Validation (+3) stages, each with a verified primary source
- [x] `ARCHITECTURE.md` and `INFORMATION_ARCHITECTURE.md` rewritten from the code; unused tables listed as reserved
- [x] **Decision: the catalog stays JSON for now.** At 60 records (and hundreds soon) static pages built from `data/catalog.json` are fast and simple; approvals publish with the next deploy, which `deploy.sh prepare` commits. Revisit when approvals need to go live without a deploy or the catalog passes ~2,000 records — then move it to Postgres with full-text search

---

## Phase 9 — Return loop ✅ Done (live 2026-10-11)

- [x] Welcome step after the first sign-in (role, stages, can help with, clinical areas; skippable, shown once) — `/welcome`
- [x] Email for "someone asked what you can help with", "your question was answered", "your answer helped"; per-type settings in profile; signed one-click unsubscribe (RFC 8058 headers + `/unsubscribe` page)
- [x] Weekly digest (Mondays 08:10 UTC, user timer): questions you could answer, new FDA authorizations, papers and trials closest to the member's profile; skipped when nothing is new, and refuses to send while the live site can't serve the unsubscribe page
- [x] Off-topic robot hits (per AI triage) hidden from the feed, home page, assistant and digest
- [x] Moderation basics: report button on questions, answers and posts; editors emailed; Hide / Dismiss in `/workspace`
- [x] Assistant evaluation set (`lib/assistant/eval.test.ts`, 45 retrieval cases + negative cases); three of four gaps it found fixed (stemming, product→maker, distinctive names); one remains documented
- [ ] Talk submissions are still live on arrival (reportable via the editors' email); a pre-moderation queue waits for real volume

---

## Phase 10 — Seed the community (founder-led)

Code cannot solve this one; the site can make it easy.

- [ ] Invite the first 20–50 experts across the six roles; help them fill profiles
- [ ] Editors answer questions publicly for the first 90 days
- [ ] Partner outreach: existing conferences and societies (IEEE VR XR Health, MedXR) for satellite sessions
- [x] Invitation page and email template — `/workspace?tab=invite` sends a personal invitation (reply-to the editor); `/join` creates a confirmed account in one step (live)

---

## Phase 11 — Live sessions, projects, events (formerly Phases 5 and 6)

- [ ] `live_sessions`: host, title, time, link, tags, capacity; scheduling UI; announcements and reminders
- [ ] Member projects: claim existing research projects, create new ones, recruit roles; merge with `/opportunities`
- [ ] Monthly online session series → annual meeting planning

---

## Must do before finishing each phase (fixed verification flow)

- [ ] `tsc --noEmit` passes
- [ ] `vitest run` all green
- [ ] New external links **actually curl'd to confirm 200**
- [ ] `next build` — **confirm `/entities/[slug]` and `/topics/[slug]` are still static (`●`)**
- [ ] Playwright hands-on run + look at screenshots (not just API responses)
- [ ] Spot-check live after deployment
- [ ] Clean up test data
- [ ] Stop test servers **by their own PID only** (this host runs other sites; a name-based kill took MedTechNet down on 2026-10-10)
- [ ] Any page or doc that describes the feature says only what the code does
- [ ] **Check that all new UI text is English**
- [ ] Commit + push

---

## Known Risks

| Risk | Mitigation |
|---|---|
| **Static generation regression** (has happened twice) | Anything that reads cookies / DB always goes in a client island; check the build output every time |
| **Cold start** | Phases 1–2 are content-type (useful even with zero users); Phases 3–6 are community-type. The order is deliberate |
| **Empty states** | Every community feature needs an honest empty state; no fake data |
| **Language confusion** | Conversation in Chinese, site in English; check on every phase verification |
| **Medical device advertising regulation** | Consult a lawyer before starting to charge for promotion (see Market Study section 7) |
| **Promising more than the site does** | Found in four forms and three pages (review 2026-10-10). A call to action ships only with the thing it calls for |
| **Silent config override** | `/etc/avrmd.env` beats project env files; happened twice. Startup env validation (Phase 6) |
| **Single copy of everything** | No backups until Phase 5 lands; treat it as the top operational risk |
| **Shared host** | Other sites run here; kill by PID, never by process name |
