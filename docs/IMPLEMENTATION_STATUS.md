# AVRMD Implementation Status

Updated: 2026-10-10, after the [full review](REVIEW_2026-10-10.md). This page describes
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
- Passwordless email sign-in through Purelymail; database sessions. Magic links are never shown on screen in production.
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

## Not working, or promising more than it does

| Surface | Reality | Plan |
|---|---|---|
| Claim a record, suggest a record, promotion request, AI research form | Validate and then **discard** the input (`/api/intake` → `validated_preview`) | Phase 5 |
| `/community` | Sample threads only | Phase 7 (remove / redirect) |
| `/opportunities` | Empty data file | Phase 7 (hide) |
| `/workspace` | Shows 761 pending candidates; no way to act | Phase 8 (review screen) |
| `/about` → "What is live today" | Out of date in both directions | Phase 5 |
| Email notifications and digests | Not built (SMTP works) | Phase 9 |
| Privacy policy, terms, takedown, account deletion | Missing | Phase 5 |
| `robots.txt`, `sitemap.xml`, analytics | Missing | Phase 7 |
| Backups | **None** for Postgres or robot data | Phase 5 |

## Known security issues (all medium or lower)

There are no critical or high findings. Six medium issues are open: missing security
headers, a publicly listable media bucket, handles derived from email, post media
accepting any URL, weak rate limits, and a racy magic-link GET. Details and fixes are in
the review §2, and all are scheduled in Phase 5.

## Docs known to be out of date

- `ARCHITECTURE.md` claims Auth.js, async jobs, Postgres full-text search, startup env validation and a Sites deploy; none exist.
- `INFORMATION_ARCHITECTURE.md` describes a four-item navigation; the header has seven.

Both are rewritten in Phase 8, once the data model settles.

## Usage (2026-10-10)

1 account · 0 member profiles · 0 questions · 0 member talks · 0 posts · 761 candidates pending review.

## Verification at this update

- `tsc --noEmit` is clean and 107 tests pass across 16 files.
- The production build passes, and entity, topic, stage and problem pages are static.
- Live checks for every public route: all return 200, except `/network`, which sends signed-out visitors to the sign-in page (307).
