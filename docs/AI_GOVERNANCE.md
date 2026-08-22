# AI Governance

## Purpose

AI assists AVRMD editors, owners, members, moderators, and visitors while remaining grounded in published records and recorded sources.

## Provider policy

- Start with OpenRouter’s `openrouter/free` router.
- Require structured output support, schema validation, and zero-data-retention routing.
- Record the actual provider/model, prompt version, schema version, citations, token usage, latency, and result.
- Never enable an automatic paid fallback. Unavailable work stays queued until an administrator explicitly configures a model and budget.

## Source boundary

Permitted sources are allowlisted metadata APIs, RSS feeds, open-license repositories, official owner domains, and editor-supplied URLs with a documented rights basis.

The system must not:

- crawl the open web indiscriminately;
- bypass paywalls, robots rules, access controls, or source terms;
- copy third-party articles, abstracts, images, or media without permission;
- send member inquiries, credentials, claim documents, private profiles, or personal data to an AI provider.

## Workflow

1. A connector collects permitted metadata.
2. Deterministic normalization and duplicate checks run first.
3. AI extracts structured fields, suggests topics and relationships, and drafts original summaries with field-level citations.
4. The application validates the schema and shows a source-versus-draft diff.
5. An editor approves or rejects every public change.
6. The approved revision is published and scheduled for a freshness check.

## User-facing surfaces

- Public corpus-grounded discovery and comparison.
- Owner drafting for descriptions, FAQs, updates, events, and campaigns.
- Member collection summaries and question drafting.
- Moderator prioritization of spam, copied content, unsafe advice, and undisclosed promotion.
- Aggregate catalog coverage and freshness analysis.

AI must refuse personalized medical advice, diagnosis, treatment recommendations, unsupported efficacy claims, and unsupported regulatory conclusions. When AI is unavailable, ordinary search and editorial workflows continue to work.

