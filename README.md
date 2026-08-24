# AVRMD — Medical XR Network

AVRMD is a professional knowledge network for discovering medical VR, AR, MR, and XR organizations, solutions, evidence, projects, events, and communities.

This repository currently contains the first two implementation layers:

- a clinical-futurist public website;
- structured catalog data and taxonomy;
- search, filters, entity pages, trust labels, and evidence relationships;
- validated-preview workflows for membership, claims, submissions, community,
  private inquiries, managed promotion, and OpenRouter-first AI research;
- PostgreSQL/Drizzle domain schemas for the durable application;
- product, architecture, AI, advertising, and trust/safety documentation.

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Infrastructure

`docker compose up -d` starts PostgreSQL, MinIO, and Mailpit for the later authenticated application milestones. The current public catalog uses reviewed seed data so it can be deployed without external services.

Generate and apply PostgreSQL migrations with:

```bash
pnpm db:generate
pnpm db:migrate
```

## Documentation

Start here:

- [Product vision](docs/PRODUCT_VISION.md) — where this is going, and why
- [Market study](docs/MARKET_STUDY.md) — comparable sites, business models, risks

Reference:

- [Product specification](docs/PRODUCT_SPEC.md)
- [Information architecture](docs/INFORMATION_ARCHITECTURE.md)
- [Technical architecture](docs/ARCHITECTURE.md)
- [AI governance](docs/AI_GOVERNANCE.md)
- [Trust, safety, and intellectual property](docs/TRUST_SAFETY_IP.md)
- [Advertising system](docs/ADVERTISING.md)
- [Implementation roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
