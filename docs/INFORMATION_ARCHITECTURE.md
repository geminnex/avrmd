# Information Architecture

The site as it is today. Navigation lives in `components/site-header.tsx`, `mobile-menu.tsx`, `site-footer.tsx` and `section-tabs.tsx`.

## Header

Five items plus the assistant:

- **Library** `/explore`
- **Stages** `/stages`
- **Talks** `/talks`
- **People** `/questions`
- **For organizations** `/for-organizations`
- **Ask AVRMD**: opens the assistant from any page.

The mobile menu groups the same destinations: Library (Records, Clinical topics, Stages, FDA devices, Papers & news, Talks), People (Ask a question, Questions, Members, Updates) and Organizations (Claim your record, Suggest a record, Promotion, About). It also holds the sign-in button.

The footer repeats these, lists the six topics, and adds Gear, Websites, Privacy and Terms, with a "professional information only, not medical advice" notice.

## Section tabs

Pages under a header item share a tab row (`section-tabs.tsx`).

- **Library tabs**: Records `/explore`, Clinical topics `/topics`, FDA devices `/clearances`, Papers & news `/signals`, Gear `/gear`, Websites `/resources`.
- **People tabs**: Questions `/questions`, Members `/members`, Updates `/network`.

## Home page (`app/page.tsx`)

1. Hero with the ask box: "Ask the medical XR community."
2. Three columns: new FDA authorizations (links to `/clearances`), latest papers and news (`/signals`), recent community questions (`/questions`, with an Ask link).
3. Browse chips: the eight stages and the six clinical topics.
4. Talks showcase: three talks, rotated every five minutes.
5. Trust strip linking to `/about`.
6. Call to action for companies and institutions: claim a record (`/for-organizations#claim`) or suggest one (`/participate`).

## Canonical record page (`/entities/[slug]`)

One statically generated page per record. Problems live at `/problems/[slug]` instead.

1. Hero: back link to the Library filtered by kind, type label, name, summary, topics ("Appears in"), stage, and claim / correction actions.
2. In-page anchors: Overview, Sources, Community, Group, and Connected records when present.
3. "What this record covers": owner or developer, event date and other facts.
4. Clinical areas: specialties and use cases.
5. Regulatory note, when the record has one.
6. FDA panel, when the record matches devices on the FDA AR/VR list.
7. Primary source and source note.
8. Questions about this record: ask a question, topic questions, Follow this record.
9. The record's group: forum threads, posts and media (`EntityGroupPanel`).
10. Inquiry form, only when the record is claimed.
11. "Follow the evidence and ecosystem": connected records grouped by kind, from `data/relations.json`.

Sections without content are not rendered.

## Taxonomy actually used

- **Record kinds** (7): problem, organization, solution, evidence, event, project, group. Gear is a filter value on top of these.
- **Clinical topics** (6, `lib/topics.ts`): surgical training, clinical simulation, pain management, rehabilitation, medical education, surgical planning. Each has a hub at `/topics/[slug]`.
- **Pipeline stages** (8, `lib/stages.ts`): research, technology, design, implementation, validation, regulatory, manufacturing, commercialization. Each has a guide at `/stages/[slug]`.
- **Facets** (`data/facets.json`, 59 entries) with kinds: specialty (23), method (25), technology (6), modality (5). Used by questions, member profiles and the assistant.
- **On catalog records**: `specialties`, `useCases`, `modalities`, optional `stages`, plus geography and maturity. Explorer filters: kind, modality, specialty, stage.
- Record review state (`source-reviewed`, `metadata-reviewed`, `needs-review`), claim status (`claimed`, `unclaimed`, `not-claimable`) and operating status (acquired, discontinued) show as trust labels.

## Redirects (`next.config.ts`, permanent)

- `/community` to `/questions`
- `/ai` to `/about#ai`
- `/advertise` to `/for-organizations`

## Not in the public navigation

- `/workspace`: editors only (editor, moderator, administrator; others get 404). Discovery queue and contribution review. Disallowed in `robots.txt`, `noindex`.
- `/opportunities`: no link from the header, menu or footer, and `noindex`; `data/opportunities.json` is empty.
- `/settings`, `/notifications` and the sign-in confirm and reset pages are account pages, disallowed in `robots.txt`.
- `/about` is reached from the footer and inline trust links; it holds review states, sources, ownership, advertising and AI policy.
- `sitemap.ts` lists the static pages plus every record, topic and stage. Member profiles and individual questions are left out.
