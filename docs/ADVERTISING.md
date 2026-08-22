# Advertising System

## Principles

- Paid placement is transparent, contextual, and independent of organic ranking.
- “Ad” or “Sponsored” appears next to every paid creative.
- Sponsorship never changes evidence labels, trust badges, or AI answers.
- No targeting based on personal health information, inferred conditions, or sensitive behavior.

## Campaign workflow

`draft → submitted → policy_review → quoted → approved → scheduled → active → paused/completed/rejected`

The MVP uses staff quotations and offline invoices. Online payment is deferred.

## Placements

- Sponsored result card in a separately labeled search slot.
- Homepage or topic-hub feature.
- Contextual entity-page placement.
- Event announcement.

## Required campaign information

- Verified advertiser and responsible organization.
- Creative text/media with rights attestation.
- Destination URL.
- Campaign dates and contextual targets.
- Intended geography and language.
- Medical-claim substantiation and relevant limitations.
- Staff decision, reviewer, reason, and audit history.

## Measurement

Track privacy-conscious impressions, clicks, click-through rate, schedule delivery, frequency, and basic bot filtering. Reports clearly distinguish estimated delivery from billable or manually reconciled figures.

## How to add a campaign today

There is no admin interface yet. A campaign is added by appending a typed entry to
`adCampaigns` in `lib/ads.ts`:

1. Add the `AdCampaign` object, including a `creative` with `rightsAttested: true`, the
   slots it may occupy, and its `startDate`/`endDate` window.
2. Set `status` to `"active"` only after the campaign is approved and invoiced.
3. Use `contextualTargets` for topic or record-kind placement. Nothing else is available
   by design: there is no behavioural, demographic, or health-inferred targeting.
4. Run `pnpm test` — `lib/ads.test.ts` checks the guardrails — then rebuild.

`getActiveAds` refuses to serve any campaign against an evidence record, and slot
positions are fixed, so a campaign can never reorder organic results.
