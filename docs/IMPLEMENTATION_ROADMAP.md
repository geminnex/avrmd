# AVRMD Implementation Checklist

> ⚠️ **Iron rule: everything on the site and in `docs/` is English.** UI text, buttons, page titles, record content, error messages, and emails are all English. Chinese is only used in conversation.

Goal: an **online, always-on conference** — come see posters, talks, and exhibitions any time, and meet people in the hallway who can help.
For the full context see [Product Vision](PRODUCT_VISION.md) | For the market basis see [Market Study](MARKET_STUDY.md)

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

## Phase 5 — Live classes and announcements (the "workshops")

- [ ] `live_sessions` table: host, title, time, link, tags, capacity
- [ ] Member scheduling UI
- [ ] System announcements: announce when scheduled, notify before start
- [ ] Appear in the homepage feed and on the matching stage page

---

## Phase 6 — Projects (claimed + created)

- [ ] Claim existing research projects (mechanism done, using `organization_memberships`)
- [ ] `member_projects` table: title, goal, stage, roles recruiting, members
- [ ] "Looking for partners" list, integrated with `/opportunities`

---

## Must do before finishing each phase (fixed verification flow)

- [ ] `tsc --noEmit` passes
- [ ] `vitest run` all green
- [ ] New external links **actually curl'd to confirm 200**
- [ ] `next build` — **confirm `/entities/[slug]` and `/topics/[slug]` are still static (`●`)**
- [ ] Playwright hands-on run + look at screenshots (not just API responses)
- [ ] Spot-check live after deployment
- [ ] Clean up test data
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
