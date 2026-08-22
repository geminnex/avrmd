import type { EntityKind } from "../catalog-types";

export type VocabRule = {
  /** Plain-language phrases a professional might actually type. */
  match: string[];
  specialties?: string[];
  useCases?: string[];
  modalities?: string[];
  kinds?: EntityKind[];
  topics?: string[];
  gear?: boolean;
};

/**
 * Bridges everyday phrasing to the catalog's own vocabulary. Everything the
 * assistant understands is listed here, so its scope is auditable.
 *
 * Phrases are matched on whole words — "ads" must not fire inside "headset".
 */
export const vocabRules: VocabRule[] = [
  {
    match: ["back pain", "chronic pain", "lower back", "pain relief", "pain management", "analgesia"],
    specialties: ["Pain management"],
    topics: ["pain-management"],
  },
  {
    match: ["surgical training", "surgery training", "procedural skills", "skills training", "practise procedures", "practice procedures", "residency", "resident", "trainee"],
    useCases: ["Skills training"],
    topics: ["surgical-training"],
  },
  {
    match: ["surgical planning", "pre-operative", "preoperative", "dicom", "medical imaging", "3d model", "visualisation", "visualization", "neurosurgery", "spine"],
    specialties: ["Radiology", "Neurosurgery", "Spine surgery", "Medical imaging"],
    useCases: ["Planning", "Visualization"],
    topics: ["surgical-planning"],
  },
  {
    match: ["simulation", "simulator", "virtual patient", "scenario", "team training", "emergency"],
    specialties: ["Emergency care"],
    useCases: ["Clinical simulation", "Team training"],
    topics: ["clinical-simulation"],
  },
  {
    match: ["rehabilitation", "rehab", "physio", "physiotherapy", "stroke", "recovery", "motor learning", "remote therapy"],
    specialties: ["Rehabilitation", "Remote care"],
    useCases: ["Motor learning", "Remote care"],
    topics: ["rehabilitation"],
  },
  {
    match: ["medical education", "nursing", "nurse", "curriculum", "students", "teaching", "medical school", "faculty"],
    specialties: ["Medical education", "Nursing"],
    topics: ["medical-education"],
  },
  {
    match: ["behavioural health", "behavioral health", "mental health", "anxiety"],
    specialties: ["Behavioral health"],
  },
  {
    match: ["headset", "headsets", "hardware", "device to buy", "gear", "quest", "vision pro", "vive", "varjo", "which device"],
    gear: true,
  },
  {
    match: ["evidence", "study", "studies", "research", "paper", "papers", "trial", "published", "peer reviewed", "peer-reviewed", "fda", "510k", "510(k)", "regulatory", "cleared"],
    kinds: ["evidence"],
  },
  {
    match: ["event", "events", "conference", "conferences", "workshop", "webinar", "meetup", "symposium"],
    kinds: ["event"],
  },
  {
    match: ["company", "companies", "vendor", "vendors", "organisation", "organization", "manufacturer", "suppliers"],
    kinds: ["organization"],
  },
  {
    match: ["project", "projects", "lab", "research programme", "research program", "grant"],
    kinds: ["project"],
  },
  { match: ["augmented reality", "ar"], modalities: ["AR"] },
  { match: ["virtual reality", "vr"], modalities: ["VR"] },
  { match: ["mixed reality", "mr", "mx"], modalities: ["MR"] },
  // XR is the umbrella, never a modality value — expand it to what it covers.
  { match: ["extended reality", "xr"], modalities: ["VR", "AR", "MR"] },
];

export type NavIntent = {
  match: string[];
  lead: string;
  links: { label: string; href: string }[];
};

/** Questions about the site itself rather than about a clinical need. */
export const navIntents: NavIntent[] = [
  {
    match: ["claim", "my company", "our page", "our record", "represent", "i work at", "own this page"],
    lead: "Claiming a record is free and verified with a work-domain email.",
    links: [
      { label: "Claim your record", href: "/for-organizations#claim" },
      { label: "What a claim covers", href: "/about#owners" },
    ],
  },
  {
    match: ["advertise", "advertising", "promote", "promotion", "sponsor", "sponsorship", "marketing", "ads", "rate card", "pricing"],
    lead: "Promotion is sold as labelled placements, quoted by staff and invoiced offline.",
    links: [
      { label: "See placements", href: "/for-organizations#promotion" },
      { label: "How advertising stays separate", href: "/about#advertising" },
    ],
  },
  {
    match: ["submit", "add a record", "missing", "suggest", "not listed", "add my"],
    lead: "Anyone can suggest a record, as long as it comes with a canonical source.",
    links: [{ label: "Suggest a record", href: "/participate" }],
  },
  {
    match: ["how do you review", "how are records reviewed", "trust", "methodology", "about avrmd", "who are you", "what is avrmd", "how does this work"],
    lead: "Every record carries a source and a review state describing how far it was checked.",
    links: [
      { label: "How records are reviewed", href: "/about#reviews" },
      { label: "About AVRMD", href: "/about" },
    ],
  },
  {
    match: ["news", "blog", "follow the industry", "journals", "websites", "where do i read", "publications", "magazine"],
    lead: "Related websites collects the journals, conferences, and industry press we track.",
    links: [{ label: "Related websites", href: "/resources" }],
  },
  {
    match: ["sign in", "log in", "login", "account", "register", "sign up"],
    lead: "Accounts are not open yet — the sign-in flow is a labelled preview.",
    links: [
      { label: "Sign-in preview", href: "/sign-in" },
      { label: "What is live today", href: "/about#status" },
    ],
  },
];
