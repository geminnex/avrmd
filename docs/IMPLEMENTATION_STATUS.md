# AVRMD Implementation Status

Updated: 2026-08-20

## Structure

The site is organised around three pillars, reflected in the primary navigation:

- **Database** — clinical topic hubs (primary) and the record-type directory (secondary),
  plus gear/hardware and a curated list of related websites.
- **Community** — discussion scoped to the same clinical topics.
- **For organizations** — free ownership claims and clearly labelled promotion.

Two homepage doorways serve the two audiences: professionals with a clinical problem, and
people tracking the medical XR industry.

## Working now

- 18 source-linked records, including four general-purpose XR headsets tracked as gear
  and explicitly marked as not medical devices.
- Six clinical topic hubs, generated from the catalog by set-intersection selectors with
  vocabulary and coverage tests guarding against silent drift.
- Directory search and filters (record type, modality, clinical specialty, gear), with
  shareable URLs.
- Ask AVRMD: server-side retrieval across records, FDA AR/VR devices, signals, talks, stage
  and topic guides and member questions; a model (via OpenRouter) writes a short answer that
  cites only those sources and picks next steps the site generated. Falls back to
  retrieval-only when no model or budget is available. See `docs/AI_GOVERNANCE.md`.
- A daily discovery job (`avrmd-discover.timer`) polling PubMed, Europe PMC, openFDA
  510(k), and ClinicalTrials.gov. It deduplicates against the catalog and proposes
  candidates only — publication requires `scripts/approve-candidate.mjs`.
- The workspace, showing that real discovery queue rather than sample metrics.
- A promotion mechanism with fixed, labelled slots, a house placeholder when nothing is
  booked, and code-enforced guardrails (never on evidence records, never reordering).

## Not connected yet

Accounts and sign-in, community posting, owner inquiry delivery, campaign scheduling and
invoicing, and browser-based approval of discovered candidates. Every intake form still
validates its contract and then stops without storing, emailing, charging, or publishing.

Pages that show example content label it as a sample, and `/about#status` is the single
place that explains the boundary.

## Verification

- TypeScript compiles clean; 42 tests pass across catalog, topics, community, resources,
  assistant, ads, and workflow suites.
- Next.js production build passes; all routes return 200 and `/advertise` permanently
  redirects to `/for-organizations`.
- The assistant returns catalog results with no OpenRouter key configured.
- Desktop and mobile visual review completed.
