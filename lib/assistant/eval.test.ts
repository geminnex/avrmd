import { describe, expect, it } from "vitest";
import { buildActions } from "./actions";
import { buildCorpus, detectFacets, detectStages, retrieve } from "./retrieve";
import { curatedTalks } from "../talks";

/**
 * Retrieval regression set for Ask AVRMD. The LLM writes answers only from
 * what retrieve() returns, so a miss here is an unanswerable question.
 * Signals are runtime data and deliberately not asserted on.
 * Cases wrapped in `known gap` document real weaknesses (it.fails).
 */

const corpus = buildCorpus({ talks: curatedTalks });
const fda = (k: string) =>
  `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/${k.startsWith("DEN") ? "denovo" : "pmn"}.cfm?ID=${k}`;
const rec = (slug: string) => `/entities/${slug}`;
const prob = (slug: string) => `/problems/${slug}`;
const talk = (slug: string) => `https://medvr.io/online-talks/${slug}`;

type Case = {
  question: string;
  /** hrefs that must appear among the 12 retrieved items */
  expect: string[];
  stages?: string[];
  facets?: string[];
  /** Documented retrieval weakness: the case is expected to fail today. */
  gap?: string;
};

const cases: Case[] = [
  // the site itself
  { question: "I forgot my password, how do I reset it?", expect: ["/help#start"] },
  { question: "How do I stop the weekly digest emails?", expect: ["/help#email"] },
  { question: "How can my company claim its record?", expect: ["/help#organizations"] },
  // clinical topics
  {
    question: "Is there VR for chronic low back pain?",
    expect: [rec("relievrx"), rec("vr-skills-therapy-review")],
    facets: [],
  },
  {
    question:
      "What options exist for pain and fear in children during needle procedures?",
    expect: [prob("procedural-pain-in-children")],
  },
  {
    question: "How can I help stroke patients regain arm function with VR?",
    expect: [prob("stroke-motor-recovery")],
  },
  {
    question: "How do I supervise a patient's therapy at home remotely?",
    expect: [prob("remote-rehab-supervision")],
  },
  {
    question:
      "How do we keep patients engaged in home rehabilitation programmes?",
    expect: [prob("home-therapy-adherence")],
  },
  {
    question: "Which companies do surgical training with VR?",
    expect: [rec("osso-vr"), "/topics/surgical-training"],
  },
  {
    question: "How can surgeons practice without cadaver lab access?",
    expect: [prob("manual-skill-without-theatre")],
  },
  {
    question:
      "How do I assess a trainee's technique objectively without a supervisor?",
    expect: [prob("skill-assessment-objectivity")],
  },
  {
    question: "Tools for surgical planning from CT or MRI scans",
    expect: ["/topics/surgical-planning", rec("3d-slicer")],
    gap: "'CT' is dropped as a 2-letter term and 3D Slicer's summary says 'medical images', not scans",
  },
  {
    question:
      "How fast can imaging be turned into a 3D model for the operation?",
    expect: [prob("imaging-to-3d-turnaround")],
  },
  {
    question: "How much realism does a clinical simulation scenario need?",
    expect: [prob("simulation-realism")],
  },
  {
    question: "How do I run simulation for a whole cohort of students?",
    expect: [prob("simulation-throughput")],
  },
  {
    question: "How can we rehearse rare emergencies that are hard to schedule?",
    expect: [prob("rare-emergency-rehearsal")],
  },
  {
    question:
      "How do I fit immersive sessions into a medical school curriculum?",
    expect: [prob("curriculum-fit")],
  },
  {
    question: "How do we train psychological first aid at scale?",
    expect: [prob("scalable-first-aid-training")],
  },

  // named products and companies
  {
    question: "Who makes RelieVRx?",
    expect: [rec("appliedvr"), rec("relievrx")],
  },
  { question: "Tell me about SentiAR", expect: [rec("sentiar")] },
  {
    question: "What is Oxford Medical Simulation?",
    expect: [rec("oxford-medical-simulation")],
  },
  {
    question: "What does Surgical Science sell?",
    expect: [rec("surgical-science")],
  },
  {
    question: "Is Apple Vision Pro used in medicine?",
    expect: [rec("apple-vision-pro")],
  },
  {
    question: "Which headset should I use, Meta Quest 3 or Varjo XR-4?",
    expect: [rec("meta-quest-3"), rec("varjo-xr-4")],
  },
  {
    question: "What is the SOFA framework for simulation?",
    expect: [rec("sofa-framework")],
  },

  // FDA devices
  {
    question: "Which AR spine navigation systems are FDA cleared?",
    expect: [fda("K251639")],
    stages: ["regulatory"],
  },
  {
    question: "Is RelieVRx FDA authorized?",
    expect: [fda("K243417"), rec("relievrx-k243417")],
    stages: ["regulatory"],
  },
  {
    question: "What is the De Novo for EaseVRx?",
    expect: [fda("DEN210014")],
    stages: ["regulatory"],
  },
  {
    question: "What FDA clearance does SentiAR CommandEP have?",
    expect: [fda("K223290"), rec("sentiar")],
    stages: ["regulatory"],
  },
  {
    question: "Is Surgical Theater SpineAR SNAP cleared by the FDA?",
    expect: [fda("K252054"), rec("surgical-theater-xr")],
    stages: ["regulatory"],
  },
  {
    question: "Medacta NextAR shoulder platform clearance",
    expect: [fda("K251737")],
  },
  {
    question: "Is Smileyscope cleared for pain in children?",
    expect: [fda("K230825")],
  },

  // stage questions
  {
    question: "How do I find a predicate device for my headset-based 510(k)?",
    expect: [prob("xr-predicate-device-selection")],
    stages: ["regulatory"],
  },
  {
    question: "How do headset OS updates interact with change control?",
    expect: [prob("platform-update-change-control")],
  },
  {
    question:
      "What are the privacy and security issues of eye tracking data from a headset?",
    expect: [prob("headset-sensor-data-privacy-security")],
  },
  {
    question:
      "How do I blind participants and design a sham control in a VR trial?",
    expect: [prob("blinding-and-sham-control-in-vr-trials")],
  },
  {
    question: "What dose of VR therapy is effective?",
    expect: [prob("vr-dose-not-standardized")],
  },
  {
    question:
      "Does the benefit of VR therapy last after the headset comes off?",
    expect: [prob("durability-of-vr-effect")],
  },
  {
    question: "How accurate is AR registration of a 3D model to the patient?",
    expect: [prob("ar-registration-accuracy")],
    stages: [],
  },
  {
    question: "How does headset latency affect fine motor precision?",
    expect: [prob("latency-and-fine-motor-precision")],
    stages: ["technology"],
  },
  {
    question: "How can haptics recreate what tissue feels like?",
    expect: [prob("haptic-tissue-fidelity")],
    stages: ["technology"],
  },
  {
    question: "Can I build once and run on every headset?",
    expect: [prob("cross-headset-portability")],
  },
  {
    question: "Does an in-headset score actually mean anything clinically?",
    expect: [prob("measurement-validity-in-xr")],
  },

  // talks
  {
    question: "Is there a talk on regulatory considerations for medical XR?",
    expect: [talk("regulatory-considerations-for-medical-xr")],
    stages: ["regulatory"],
  },
  {
    question: "What is the FDA OSEL doing on evaluation methods?",
    expect: [talk("fda-osel-advanced-evaluations-methods")],
  },
  {
    question: "Talk about augmented reality for post stroke spatial neglect",
    expect: [talk("ar-spatial-neglect")],
  },
  {
    question: "VR avatar therapy for schizophrenia hallucinations",
    expect: [talk("avatar-treat-schizophrenic")],
  },
  {
    question:
      "Is there evidence AR helps orthopaedic training in a randomized trial?",
    expect: [talk("ar-orthopaedic-training")],
  },
];

const empty: string[] = [
  "asdfgh qwerty zxcvb",
  "What is the capital of France?",
  "best pizza recipe with mushrooms",
];

describe("retrieval eval", () => {
  const hits = new Map<string, boolean>();

  for (const c of cases) {
    const run = () => {
      const items = retrieve(c.question, corpus);
      const hrefs = items.map((item) => item.href);
      const ok = c.expect.every((href) => hrefs.includes(href));
      hits.set(c.question, ok);
      for (const href of c.expect)
        expect(hrefs, `missing ${href}`).toContain(href);
      if (c.stages)
        expect(detectStages(c.question)).toEqual(
          expect.arrayContaining(c.stages),
        );
      if (c.facets)
        expect(detectFacets(c.question)).toEqual(
          expect.arrayContaining(c.facets),
        );
    };
    if (c.gap) {
      // known gap: see `gap`
      it.fails(`[gap] ${c.question} (${c.gap})`, run);
    } else {
      it(c.question, run);
    }
  }

  it.each(empty)(
    "returns no record or FDA item for off-topic %j",
    (question) => {
      const items = retrieve(question, corpus);
      expect(
        items.filter((item) => ["record", "fda", "talk"].includes(item.type)),
      ).toEqual([]);
    },
  );

  it("offers a regulatory stage action and the clearances search for FDA questions", () => {
    const question = "Which AR spine navigation systems are FDA cleared?";
    const items = retrieve(question, corpus);
    const actions = buildActions({
      facets: detectFacets(question),
      stages: detectStages(question),
      topicSlugs: [],
      helperCount: 0,
      items,
      query: question,
    });
    const ids = actions.map((action) => action.id);
    expect(ids).toEqual(expect.arrayContaining(["ask", "stage", "clearances"]));
  });

  it("recall@12 across non-gap cases is at least 0.9", () => {
    const scored = cases.filter((c) => !c.gap);
    const found = scored.filter((c) => {
      const hrefs = retrieve(c.question, corpus).map((item) => item.href);
      return c.expect.every((href) => hrefs.includes(href));
    });
    const recall = found.length / scored.length;
    const missed = scored
      .filter((c) => !found.includes(c))
      .map((c) => c.question);
    expect(recall, `missed: ${missed.join(" | ")}`).toBeGreaterThanOrEqual(0.9);
    // Re-runs every case at once; slower than one case on a busy host.
  }, 30_000);
});
