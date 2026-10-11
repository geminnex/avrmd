# AVRMD Implementation Status

Updated: 2026-10-11, after Phases 5–9 and the Phase 10 invitation tools (all awaiting deploy; the live site still runs the 2026-10-10 15:10 build). This page describes
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
- In-app notifications with a header bell, and email notifications (routed questions, answers, accepted answers) with per-kind opt-out and one-click unsubscribe.
- A one-time welcome step after the first sign-in (role, stages, can-help-with, topics).
- A weekly digest email (`avrmd-digest.timer`): matching new FDA authorizations, papers, trials and open questions; nothing is sent when nothing is new.
- Reporting of questions, answers and posts; editors hide or dismiss from `/workspace`.
- Editor invitations: an editor sends a personal invitation from `/workspace`; the `/join` link creates a confirmed account in one step (30 days, single use).
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
| `/opportunities` | Empty; posting not built (the page says so) | Phase 11 (member projects) |
| Live sessions, events, annual meeting | Not built | Phase 11 |
| Off-site backups | Local nightly backups only | Owner decision |
| Google sign-in in production | Needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Owner action |
| Live assistant | Retrieval-only until `/etc/avrmd.env` stops overriding the key | Owner action |

## Security

All six medium findings from the review are fixed: security headers and CSP, closed media
listing, neutral handles, own-upload-only post media, single-use confirm-step email links,
404 for malformed ids, an Origin check on every state-changing API request, and
Postgres-backed rate limits on sign-in, registration, posting, questions, reports, the
assistant and invitations.

## Docs

`ARCHITECTURE.md` and `INFORMATION_ARCHITECTURE.md` were rewritten from the code in Phase 8.
