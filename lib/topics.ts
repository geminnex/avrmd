import { catalog, getEntity } from "./catalog";
import type { CatalogEntity, EntityKind } from "./catalog-types";

export type Topic = {
  slug: string;
  /** Full name, used as the hub page title. */
  name: string;
  /** Short form for chips, cards, and navigation. */
  shortName: string;
  tagline: string;
  intro: string;
  /** Selector vocabulary — must match strings already used in the catalog. */
  specialties: string[];
  useCases: string[];
  /** Curation valves for records the selectors miss or wrongly catch. */
  pinnedSlugs?: string[];
  excludeSlugs?: string[];
  accent: CatalogEntity["accent"];
};

export const topics: Topic[] = [
  {
    slug: "surgical-training",
    name: "Surgical training and procedural skills",
    shortName: "Surgical training",
    tagline: "Rehearse procedures and assess technique before the operating room",
    intro:
      "Immersive platforms that let surgeons and trainees practise procedures repeatedly, with structured assessment of technique. Records here cover training systems and the organisations building them.",
    specialties: ["Surgery", "Orthopedics", "Dentistry"],
    useCases: ["Skills training", "Just-in-time practice"],
    accent: "blue",
  },
  {
    slug: "clinical-simulation",
    name: "Clinical simulation and team training",
    shortName: "Clinical simulation",
    tagline: "Practise clinical judgment, communication, and team response",
    intro:
      "Virtual-patient and scenario-based simulation for decision-making, escalation, and team coordination — the situations that are hard to schedule with manikins or standardised patients.",
    specialties: ["Emergency care", "Military medicine"],
    useCases: ["Clinical simulation", "Team training", "Clinical judgment"],
    accent: "coral",
  },
  {
    slug: "pain-management",
    name: "Pain management and immersive therapeutics",
    shortName: "Pain management",
    tagline: "Immersive therapy for chronic pain, including a cleared prescription device",
    intro:
      "Skills-based immersive therapy used as an adjunct in pain care. This is the most evidence-dense topic in the catalog: it includes a cleared prescription device and the regulatory and peer-reviewed records behind it.",
    specialties: ["Pain management", "Behavioral health"],
    useCases: ["Therapy support"],
    accent: "violet",
  },
  {
    slug: "rehabilitation",
    name: "Rehabilitation and recovery",
    shortName: "Rehabilitation",
    tagline: "Motor learning, remote therapy, and progress tracking",
    intro:
      "Immersive rehabilitation covering motor learning, remote delivery of therapy, and objective progress measurement. A smaller topic that is actively growing.",
    specialties: ["Rehabilitation", "Remote care"],
    useCases: ["Motor learning", "Progress monitoring", "Remote care"],
    accent: "teal",
  },
  {
    slug: "medical-education",
    name: "Medical and nursing education",
    shortName: "Medical education",
    tagline: "Curriculum-scale immersive teaching and assessment",
    intro:
      "Platforms and research programmes that bring immersive learning into medical and nursing curricula, including assessment, analytics, and integration with existing simulation centres.",
    specialties: ["Medical education", "Nursing"],
    useCases: [],
    accent: "gold",
  },
  {
    slug: "surgical-planning",
    name: "Surgical planning and visualization",
    shortName: "Surgical planning",
    tagline: "Turn imaging into interactive 3D for planning and rehearsal",
    intro:
      "Converting medical imaging into interactive three-dimensional models for pre-operative planning, rehearsal, intra-operative reference, and patient communication.",
    specialties: ["Neurosurgery", "Spine surgery", "Radiology", "Medical imaging"],
    useCases: ["Planning", "Visualization"],
    accent: "blue",
  },
];

export function getTopic(slug: string) {
  return topics.find((topic) => topic.slug === slug);
}

export function topicMatches(topic: Topic, entity: CatalogEntity) {
  if (topic.excludeSlugs?.includes(entity.slug)) return false;
  if (topic.pinnedSlugs?.includes(entity.slug)) return true;
  return (
    entity.specialties.some((item) => topic.specialties.includes(item)) ||
    entity.useCases.some((item) => topic.useCases.includes(item))
  );
}

export function getTopicEntities(topic: Topic) {
  return catalog.filter((entity) => topicMatches(topic, entity));
}

const topicKindOrder: EntityKind[] = [
  "solution",
  "organization",
  "evidence",
  "project",
  "event",
  "group",
];

export function getTopicEntitiesByKind(topic: Topic) {
  const entities = getTopicEntities(topic);
  return topicKindOrder
    .map((kind) => ({ kind, items: entities.filter((entity) => entity.kind === kind) }))
    .filter((group) => group.items.length > 0);
}

export function getTopicsForEntity(entity: CatalogEntity) {
  return topics.filter((topic) => topicMatches(topic, entity));
}

export function getTopicsForSlug(slug: string) {
  const entity = getEntity(slug);
  return entity ? getTopicsForEntity(entity) : [];
}
