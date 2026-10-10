# AVRMD Implementation Status

Updated: 2026-10-10, after the [full review](REVIEW_2026-10-10.md) and the Phase 5 code work. This page describes
what the code does today. The plan is in [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md).

## Live and working

**Content (read-only, real data)**
- 54 source-linked catalog records: organizations, solutions, evidence, events, a project, and clinical and technical problems.
- 6 clinical topic hubs and 8 pipeline-stage guides, generated from the catalog and guarded by vocabulary and coverage tests.
- `/clearances`: the FDA's list of authorized AR/VR medical devices (120 devices, 70 companies), refreshed daily. Records with FDA entries show them on their page.
- `/signals`: about 400 auto-discovered papers, trials and news items, labelled as unreviewed.
- `/talks`: 54 curated recorded talks, plus member submissions.
- `/gear`, `/resources`, `/explore` with filters.

**Accounts and community (persisting)**
- Accounts: email + password (scrypt) confirmed by email, Google sign-in when configured, password reset that signs out other devices, account deletion. Database sessions. Mail through Purelymail.
- Contributions: suggest a record, claim a record, promotion enquiry — stored and emailed to the editors; private messages to verified representatives.
- Member profiles (role, stages, can-help-with, looking-for, interests, affiliation) and a member directory listing only members who declared something.
- Questions and answers. A new question notifies members whose can-help-with matches its tags (at most 8 per question, at most 5 per member per day). The asker can mark the answer that helped.
- In-app notifications with a header bell.
- Network posts, comments, likes and image uploads; organization groups (forum, blog, media) for claimed records.

**Ask AVRMD (assistant)**
- Server-side retrieval over records, FDA devices, signals, talks, stage and topic guides, websites and member questions.
- A model (OpenRouter, Claude Haiku 5.5) writes a short answer that cites only those sources and picks next steps the site generated. It falls back to retrieval-only without a key, budget or working model.
- Usage is recorded in `ai_jobs`/`ai_runs` without the question text. See `AI_GOVERNANCE.md`.
- ⚠️ In production it is **retrieval-only until `/etc/avrmd.env` stops overriding the key** (Phase 5, owner action).

**Daily discovery robot** (`avrmd-discover.timer`)
- 10 sources: the FDA AR/VR device list, openFDA 510(k), PubMed, Europe PMC, ClinicalTrials.gov, arXiv, JMIR XR, JMIR Serious Games, Frontiers in VR, Auganix.
- Writes signals and review candidates. Publication into the catalog still requires `scripts/approve-candidate.mjs`.

## Not working yet

| Surface | Reality | Plan |
|---|---|---|
| `/community` | Sample threads only (labelled) | Phase 7 (remove / redirect) |
| `/opportunities` | Empty; posting not built (the page says so) | Phase 7 (hide) |
| `/workspace` | Shows pending candidates; no way to act | Phase 8 (review screen) |
| Review of contributions | By email; no in-site screen | Phase 8 |
| Email notifications and digests | Not built | Phase 9 |
| `robots.txt`, `sitemap.xml`, analytics | Missing | Phase 7 |
| Off-site backups | Local nightly backups only | Owner decision |
| Live assistant | Retrieval-only until `/etc/avrmd.env` stops overriding the key | Owner action |

## Security

All six medium findings from the review except M5 (rate limiting, Phase 6) are fixed:
security headers and CSP, closed media listing, neutral handles, own-upload-only post media,
a confirm-step magic link with atomic consumption, 404 for malformed ids, and an Origin
check on every state-changing API request.

## Docs known to be out of date

- `ARCHITECTURE.md` claims Auth.js, async jobs, Postgres full-text search, startup env validation and a Sites deploy; none exist.
- `INFORMATION_ARCHITECTURE.md` describes a four-item navigation; the header has seven.

Both are rewritten in Phase 8, once the data model settles.

## Usage (2026-10-10)

1 account · 0 member profiles · 0 questions · 0 member talks · 0 posts · 761 candidates pending review.

**Host:** `/home` is 97% full (4.9 GB free).

## Verification at this update

- `tsc --noEmit` is clean and 137 tests pass.
- The production build passes, and entity, topic, stage and problem pages are static.
- Live checks for every public route: all return 200, except `/network`, which sends signed-out visitors to the sign-in page (307).
