import { getTopic } from "./topics";

export type ThreadPost = {
  /** Professional role, never a name — these are illustrative, not real people. */
  role: string;
  /** Demonstrates how a verified owner's reply is labelled. */
  official?: boolean;
  body: string;
};

export type CommunityThread = {
  slug: string;
  topicSlug: string;
  kind: "question" | "discussion";
  title: string;
  excerpt: string;
  posts: ThreadPost[];
  relatedEntitySlugs: string[];
  /** Every seeded thread is an example. Real discussion opens with accounts. */
  sample: true;
};

export const communityThreads: CommunityThread[] = [
  {
    slug: "evaluating-an-xr-simulation-pilot",
    topicSlug: "clinical-simulation",
    kind: "question",
    title: "What should a hospital evaluate before committing to an XR simulation pilot?",
    excerpt:
      "Beyond headset cost, which operational questions decide whether a pilot survives its first year?",
    posts: [
      {
        role: "Simulation centre director",
        body: "We are scoping a pilot across emergency and nursing education. Procurement keeps focusing on hardware cost, but my concern is scheduling, cleaning between sessions, and who owns technical support when a session fails at 7am.",
      },
      {
        role: "Clinical educator",
        body: "Ask how scenarios are authored and whether your own faculty can edit them. If every change needs the vendor, the pilot stalls the moment your curriculum shifts. Also confirm whether the platform runs screen-based as well as in headset — that decided it for us when headset supply was tight.",
      },
      {
        role: "Biomedical engineering lead",
        body: "Add device management to the list. Fleet updates, network requirements, and whether the system needs to reach the internet from a clinical VLAN are the questions our security review asks first.",
      },
    ],
    relatedEntitySlugs: ["oxford-medical-simulation", "simx"],
    sample: true,
  },
  {
    slug: "headset-versus-screen-based-nursing",
    topicSlug: "clinical-simulation",
    kind: "discussion",
    title: "Headset or screen-based delivery for large nursing cohorts?",
    excerpt:
      "With cohorts in the hundreds, does immersion justify the logistics compared with screen delivery?",
    posts: [
      {
        role: "Nursing programme lead",
        body: "We run cohorts of roughly 300. Headsets are compelling in demonstrations, but the throughput maths is unforgiving. Interested in how others split delivery between headset and desktop for the same scenario content.",
      },
      {
        role: "Simulation technologist",
        body: "We treat headset time as the scarce resource and reserve it for scenarios where spatial reasoning matters. Everything focused on dialogue and decision sequencing runs on screens. Same scenario library, two delivery modes, far less queueing.",
      },
    ],
    relatedEntitySlugs: ["oxford-medical-simulation"],
    sample: true,
  },
  {
    slug: "measuring-skill-transfer-to-the-or",
    topicSlug: "surgical-training",
    kind: "question",
    title: "How are teams measuring skill transfer from VR practice to the operating room?",
    excerpt:
      "In-headset metrics are easy to collect. Linking them to real operative performance is the hard part.",
    posts: [
      {
        role: "Orthopaedic training director",
        body: "Our platform reports completion times and error counts, and residents improve on those curves quickly. What I cannot yet show my department is whether that improvement appears in the operating room.",
      },
      {
        role: "Surgical education researcher",
        body: "Treat the in-headset metrics as process measures, not outcome measures. If you want a transfer claim you need a pre-agreed operative assessment instrument and an independent assessor. Anything less and you are measuring familiarity with the simulator.",
      },
    ],
    relatedEntitySlugs: ["precisionos", "osso-vr"],
    sample: true,
  },
  {
    slug: "multi-site-residency-rollout",
    topicSlug: "surgical-training",
    kind: "discussion",
    title: "Logistics of rolling out procedural VR across multiple residency sites",
    excerpt: "Who owns the headsets, the scheduling, and the faculty time when sites are distributed?",
    posts: [
      {
        role: "Programme coordinator",
        body: "Four sites, one training budget. The pilot site succeeded largely because one enthusiastic attending drove it. I am trying to work out what happens at the sites without that person.",
      },
      {
        role: "Residency programme director",
        body: "Name an owner per site before the hardware ships, and put practice sessions on the rota rather than leaving them optional. Voluntary use collapses during busy rotations, which is exactly when the practice would help most.",
      },
    ],
    relatedEntitySlugs: ["precisionos", "fundamental-xr"],
    sample: true,
  },
  {
    slug: "what-the-relievrx-clearance-covers",
    topicSlug: "pain-management",
    kind: "question",
    title: "What does the RelieVRx 510(k) clearance actually cover?",
    excerpt:
      "Reading the regulatory record versus the marketing summary — where exactly do the two differ?",
    posts: [
      {
        role: "Pain medicine physician",
        body: "Colleagues describe this as an approved VR treatment for back pain, which sounds broader than what I read in the clearance record. I would like to understand the stated indication precisely before discussing it in our service.",
      },
      {
        role: "Regulatory affairs specialist",
        body: "Read the indication statement in the summary itself rather than any secondary description. A 510(k) establishes substantial equivalence to a predicate device for a specific indication and population — it is not a general endorsement, and it is specific to the United States and to the date of clearance.",
      },
      {
        role: "Verified owner representative",
        official: true,
        body: "Example of an owner reply: representatives can point to the official indication and device documentation on a record like this, and correct factual errors. They cannot remove critical discussion or alter the linked evidence.",
      },
    ],
    relatedEntitySlugs: ["relievrx", "relievrx-k243417", "vr-skills-therapy-review"],
    sample: true,
  },
  {
    slug: "adherence-home-based-immersive-therapy",
    topicSlug: "pain-management",
    kind: "discussion",
    title: "What supports adherence with home-based immersive therapy programmes?",
    excerpt: "Engagement is strong in week one. Sustaining it through a multi-week programme is harder.",
    posts: [
      {
        role: "Behavioural health clinician",
        body: "Patients are enthusiastic initially, then attendance drops around the third week — a pattern familiar from other self-directed programmes. Curious whether others have found scheduling or check-in structures that hold.",
      },
      {
        role: "Digital health programme manager",
        body: "A brief scheduled human check-in mattered more for us than anything in the software. Also worth separating device problems from genuine disengagement in your data; early on we were counting a charging issue as a motivation issue.",
      },
    ],
    relatedEntitySlugs: ["relievrx", "xrhealth"],
    sample: true,
  },
  {
    slug: "remote-progress-monitoring-workflows",
    topicSlug: "rehabilitation",
    kind: "question",
    title: "How do remote rehabilitation sessions fit into existing clinical workflows?",
    excerpt: "The therapy runs at home, but the review, documentation, and escalation still sit with a clinician.",
    posts: [
      {
        role: "Rehabilitation therapist",
        body: "Remote delivery is attractive for patients who travel long distances. What I have not solved is where the session data lands and how much of my week it takes to review it meaningfully.",
      },
      {
        role: "Physiotherapy service lead",
        body: "Decide in advance which measures actually change a treatment decision and ignore the rest. Reviewing everything a platform records is not sustainable, and dashboards will happily generate more than any caseload can absorb.",
      },
    ],
    relatedEntitySlugs: ["xrhealth", "healthcare-biorobotics-lab"],
    sample: true,
  },
  {
    slug: "fitting-xr-into-existing-curriculum",
    topicSlug: "medical-education",
    kind: "discussion",
    title: "Fitting immersive sessions into an already full curriculum",
    excerpt: "What did XR replace in your timetable, rather than being added on top of it?",
    posts: [
      {
        role: "Medical education lead",
        body: "Every proposal we receive adds immersive sessions to an already saturated timetable. The interesting question is what comes out, and how you defend that decision to the faculty who taught it.",
      },
      {
        role: "Clinical skills tutor",
        body: "We replaced part of a demonstration-heavy block where students mostly watched. Keeping assessment identical across the change made the comparison defensible and kept the conversation about learning rather than technology.",
      },
    ],
    relatedEntitySlugs: ["osso-vr", "oxford-medical-simulation"],
    sample: true,
  },
  {
    slug: "imaging-to-interactive-3d-workflow",
    topicSlug: "surgical-planning",
    kind: "question",
    title: "Where do imaging-to-3D planning workflows break down in practice?",
    excerpt: "Segmentation quality, turnaround time, and who does the work between scan and rehearsal.",
    posts: [
      {
        role: "Neurosurgical fellow",
        body: "The rendered models are impressive in demonstrations. In routine use my questions are turnaround time for an urgent case and who performs segmentation when radiology is already at capacity.",
      },
      {
        role: "Radiology 3D lab manager",
        body: "Turnaround is mostly a staffing question rather than a software one. We found it essential to define which cases justify a model in advance, otherwise every request becomes urgent and the service loses credibility.",
      },
    ],
    relatedEntitySlugs: ["surgical-theater-xr"],
    sample: true,
  },
];

export function getThreadsForTopic(topicSlug: string) {
  return communityThreads.filter((thread) => thread.topicSlug === topicSlug);
}

export function getThread(slug: string) {
  return communityThreads.find((thread) => thread.slug === slug);
}

export function getThreadsByTopic() {
  const grouped = new Map<string, CommunityThread[]>();
  for (const thread of communityThreads) {
    grouped.set(thread.topicSlug, [...(grouped.get(thread.topicSlug) ?? []), thread]);
  }
  return [...grouped.entries()]
    .map(([topicSlug, threads]) => ({ topic: getTopic(topicSlug), threads }))
    .filter((group): group is { topic: NonNullable<typeof group.topic>; threads: CommunityThread[] } =>
      Boolean(group.topic),
    );
}
