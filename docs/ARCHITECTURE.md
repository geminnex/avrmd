# Technical Architecture

## Application

- Next.js and TypeScript for public pages, member/owner dashboards, administration, and server routes.
- PostgreSQL and Drizzle ORM for durable application state.
- Auth.js passwordless magic-link authentication through replaceable SMTP.
- S3-compatible object storage, with MinIO for local development.
- PostgreSQL-backed asynchronous jobs to keep self-hosting simple.
- First-party event collection for operational and campaign analytics.

The public first milestone renders reviewed seed data without external services. Database-backed submissions, accounts, claims, and moderation are added behind the same domain interfaces.

## Core domain

- `entities`: canonical records with type, slug, status, review state, and structured metadata.
- `entity_relations`: directional, typed knowledge-graph relationships.
- `topics` and `entity_topics`: normalized taxonomy.
- `source_records` and `field_provenance`: citations, rights basis, licenses, retrieval times, and source fingerprints.
- `content_revisions`: versioned, reviewable changes.
- `claims` and `organization_memberships`: representative verification and owner permissions.
- `community_threads` and `community_posts`: discussions, questions, answers, and official updates.
- `inquiries`: structured, private member-to-owner requests.
- `campaigns`, `creatives`, `placements`, and `delivery_events`: managed advertising.
- `ai_jobs`, `ai_runs`, and `ai_suggestions`: provider-neutral, auditable assistance.
- `moderation_reports` and `audit_events`: governance history.

## Search

The first production search layer uses PostgreSQL full-text search, trigram matching, aliases, and deterministic facets. AI discovery retrieves only published catalog results through this layer; it does not bypass publication state or source permissions.

## Security baseline

- Strict server-side authorization with role and entity-scope checks.
- Sanitized rich text; no arbitrary HTML.
- Upload validation, malware scanning adapter, and rights attestation.
- CSRF protection, rate limiting, secure cookies, and security headers.
- Encrypted secrets and claim evidence; verification documents are deleted after adjudication.
- Immutable audit events for privileged operations.
- Backup/restore drills before production launch.

## Deployment

- Docker Compose for self-hosting.
- Replaceable SMTP, S3, and AI providers.
- Environment variables validated at startup.
- Sites deployment is used for the public milestone; services requiring persistent PostgreSQL and private storage remain feature-gated until production infrastructure is connected.

