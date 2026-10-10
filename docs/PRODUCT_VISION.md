# AVRMD — Product Vision: A Conference That Never Ends

## North Star (set 2026-10-10)

> **Become the largest and most complete virtual reality for medicine community in the world.**
> Help clinicians, academic researchers, engineers, device providers, product developers, and business and investment people find **direction, resources, and help** here.
> Destination: **the AVRMD annual conference** — so that good technology actually reaches patients, and the related business can grow effectively.

### "Largest and most complete" breaks down into two measurable things

| | Meaning | Why it is achievable | Measure |
|---|---|---|---|
| **Most complete (content)** | Every company, every marketed medical device, every clinical trial, and every conference in the field can be looked up, with sources | Doable with zero users; automated discovery + agents can scale it; **this is the only thing we can win first** | Record count, FDA AR/VR device coverage rate, trial coverage rate |
| **Largest (people)** | People in all six roles are here and help each other | Can only be done by attracting them with content first, then bringing them back through routing | Members with a filled-in profile, questions answered per week, question answer rate |

**The order cannot be reversed**: without content, people who arrive will leave (this is exactly how the forum on the old site avrmd.com went empty).

### Four growth stages

1. **Database (now → win "most complete" first)**
   Grow the catalog from 49 records to over a thousand: marketed devices (FDA 510(k) / De Novo, etc.), clinical trials, companies, research teams, conferences. Every record carries a source and is tagged with clinical topic × pipeline stage. The existing daily discovery job is the engine; agents are the accelerator.
2. **Community (Phase 3–6 → get people to come back)**
   Member directory, question routing (done), live classes, project partner matching. The key metric is "did anyone answer the question".
3. **Online events (→ rehearsal for the annual conference)**
   Regular online sessions: one themed session per month (e.g. "Registration error in AR surgical navigation"), with speakers invited from members and talk submitters. **Partner with existing conferences first** (IEEE VR XR Health, MedXR, etc.) to run satellites / meetups, rather than competing head-on.
4. **AVRMD annual conference + business (→ destination)**
   Hold an in-person conference only after the online sessions have built up a speaker base and an audience. The business model follows the order from the market study: free first → vendor claiming and clearly labeled exposure → leads and industry intelligence. **Consult medical device advertising regulations before charging for promotion.**

### "Get good technology actually used" — the platform's unique value

Technology usually gets stuck not because of the technology itself, but because of **disconnects between roles**: engineers do not know the real clinical pain points, clinicians do not know what is available, and startups do not know how regulation and procurement work. The two axes (clinical topic × pipeline stage) are designed for exactly this:

- Clinical problem ↔ solution ↔ evidence are linked to each other (already in place)
- "Which gate am I stuck at" → find people who have been through that gate (stage pages + question routing, already in place)
- To do: **adoption guides** (hospital procurement, IRB, reimbursement), clear labeling of **technology maturity and evidence level**, and clinical pilot matching (hospitals willing to trial ↔ companies needing pilot sites)

### What we will not do

- Do not chase vanity numbers (fake accounts, records whose source cannot be found) — in medicine, trust once lost does not come back
- Do not build features that only work with lots of people during the cold-start period (leaderboards, like economy)
- Do not let payment change ranking or review results (already enforced in code)

---


## Core Positioning (set 2026-08)

> **eventually, become an online, always-on conference. can come visit posters, talks, exhibitions.**

This framing is more accurate than "LinkedIn for medical XR", and it solves the core problem found in the market study:

**Medical XR people do gather, but only at conferences.** (the XR Health workshop at IEEE VR, Laval Virtual, MedXR@COMPSAC, MedVR Accelerator) Conferences happen once a year, and afterwards everyone disperses. The forum on the old site avrmd.com was empty not because the features were bad, but because **there was no program** — LinkedIn is a tool, whereas a conference is a destination with a program.

### What is already built, mapped into place

| Conference component | Counterpart on the site | Status |
|---|---|---|
| **Exhibition booths** | Groups for companies / organizations (forum, Blog, media) | ✅ Done |
| **Posters** | Evidence records, research projects | ✅ Done (49 records) |
| **Program book** | Clinical topic × pipeline stage | Topics ✅ / Stages ⏳ |
| **Hallway conversations** | Asking questions, mentoring, finding partners | ⏳ To build |
| **Talks** | User-submitted talks | ⏳ To build |
| **Workshops / courses** | Live online classes given by users | ⏳ To build |
| **Conference announcements** | System announcements | ⏳ To build |
| **Daily bulletin** | Signals (daily automated discovery) | ✅ Done |

---

## Two Axes

| Axis | Question | Status |
|---|---|---|
| **Clinical domain** | "What medical problem are we solving?" | ✅ 6 topics, 15 clinical problems |
| **Pipeline stage** | "Which gate am I stuck at?" | ✅ Data layer done (8 stages) / ⏳ UI to build |

**Eight stages**: research → technology → design → implementation → validation → regulatory → manufacturing → commercialization

---

## Features to Build (added from this conversation)

### 1. Technology as a first-class topic ⭐ New
> "technology can be an important topic. The biggest obstacles and breakthroughs R&D people need. Software and hardware"

**Design**: Technical problems share the same `problem` record type as clinical problems, but hang under a **pipeline stage** rather than a clinical topic. For example:
- Hand-tracking accuracy is not good enough to support fine surgical movements (hardware)
- Haptic feedback cannot yet reproduce the real feel of tissue (hardware)
- Registration error when overlaying AR onto patient anatomy (software)
- Performance bottleneck for DICOM → real-time 3D (software)
- Heat dissipation and battery during long surgeries (hardware)
- Fragmented OpenXR ecosystem, cross-device porting cost (software)

**Structural change needed**: Currently a `problem` record is required to have a `topicSlug` (clinical topic). This must be relaxed to "clinical problems attach to a topic, technical problems attach to a stage", and the coverage guard in `lib/topics.test.ts` updated.

### 2. User-submitted talks ⭐ New
> "users can add their own talks and presentation links, categorized with tags. The system can use tags to provide categorized search at any time. randomly showcase these as headlines."

- New content type `talk`: title, speaker, external link (YouTube/Vimeo/slides), tags
- Tags reuse the existing **facets (59) + 8 stages + clinical topics** — no new classification system needed
- **Random rotation as the homepage headline**: this solves two things at once — the homepage is different every day, and submitters get exposure (their motivation to submit)
- Same trust level as signals: external links, not reviewed records, visually distinct

### 3. Learning guides and live online classes ⭐ New
> "also provide basic explanations of the technology and learning guides. users can host live online classes. the system can make announcements."

- **Learning guides**: one introductory explainer per pipeline stage (each stage in `lib/stages.ts` already has a `question` and `description` written, which is a ready-made skeleton)
- **Live online classes**: users can schedule a live session (title, time, link, tags, attendee cap)
- **System announcements**: automatically announce when a class is scheduled; notify before a class that has sign-ups starts
- This is the conference's workshop track

### 4. Mentoring: profile declarations + automatic question routing
- A profile states "I can help with: regulatory, Unity development" and "I need help with: clinical trial design"
- When someone asks a question and tags it, notify the people who declared they can help
- **"Someone needs your help" is the strongest motivation to come back**

### 5. Projects: claimed + created
- `claimed`: existing research projects in the catalog can be claimed (mechanism done, using `organization_memberships`)
- `created`: members create new projects, tagging stage, roles needed, and whether recruiting

---

## Suggested Implementation Order

1. **Profile expansion + member directory** — roles, stages, expertise, can help / needs help. Without this layer, routing has no targets.
2. **Questions + routing + notifications** — the interaction engine. The strongest driver of return visits.
3. **Talks submission + tag search + random headline** — relatively independent, can be done early, and immediately makes the homepage feel alive.
4. **Technical problems (`problem` attached to a stage)** — needs a small structural change.
5. **Stage guide pages + live classes + announcements**
6. **Projects (claimed + created)**

---

## Completed This Round: Data Collection

| Item | Before | Now |
|---|---|---|
| Catalog records | 33 | **49** |
| Static record pages | 18 | **34** |
| Reference sites | 20 | **31** |
| Facets | 54 | **59** |
| Tests | 68 | **70** |

**New content covers**: companies (SentiAR, Oxford VR, Floreo, Karuna Labs, VOXEL-MAN, firsthand, MindMaze, Surgical Science), historical companies (Limbix, Intelligent Ultrasound, both marked `acquired` with the acquirer's announcement attached), a university lab (Stanford VHIL), open-source software (3D Slicer, SOFA Framework), hardware (Magic Leap 2), conferences (IEEE VR 2027, ISMAR 2026), and 11 reference sites (PubMed, ClinicalTrials.gov, npj Digital Medicine, RSNA, DTx Alliance, openFDA, etc.).

**New schema**: `stages` (8-stage pipeline), `lib/stages.ts`.

**Errors found and avoided during research**:
- SensoryX has pivoted to defense / spatial-computing tracking and has **no medical application at all** — copying the old site's 2019 description of the "VRfree medical glove" would have published wrong information, so it was excluded
- Intelligent Ultrasound was **split and sold** (clinical AI → GE HealthCare in 2024; simulation business → Surgical Science in 2025), not simply acquired
- No verifiable source page could be found for iMSTK (the official site blocks bots, and the Kitware page is only 2019 remnants) → **not included**; better to have nothing than to guess
- floreotech.com → floreovr.com and sensoryx.com → sensoryx.tech both redirect, so source URLs must use the final address

---

## Verification (every round)

1. `tsc --noEmit`; `vitest run`
2. **Actually curl each new record's sourceUrl once to confirm it returns 200**
3. `next build` — confirm `/entities/[slug]` and `/topics/[slug]` are still static (`●`)
4. Browser testing + screenshot check
5. Spot-check live after deployment
