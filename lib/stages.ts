import { catalog } from "./catalog";
import type { CatalogEntity, EntityKind, PipelineStage } from "./catalog-types";

export type Stage = {
  slug: PipelineStage;
  name: string;
  /** What someone at this stage is actually trying to do. */
  question: string;
  description: string;
};

/**
 * The path from a clinical idea to something that reaches patients. Ordered:
 * a record or a person sits at one or more points along it.
 *
 * `validation` and `regulatory` are the two stages that most often stall a
 * medical XR product and where guidance is scarcest — they are the reason
 * this axis exists separately from the clinical-topic axis.
 */
export const stages: Stage[] = [
  {
    slug: "research",
    name: "Research and evidence",
    question: "What is already known, and what still needs proving?",
    description:
      "Studies, trials, and reviews that establish whether an approach works and for whom.",
  },
  {
    slug: "technology",
    name: "Technology",
    question: "What should this be built on?",
    description:
      "Headsets, tracking, haptics, rendering, and the platform choices that constrain everything downstream.",
  },
  {
    slug: "design",
    name: "Design",
    question: "How should it work for the people using it?",
    description:
      "Clinical workflow, interaction design, comfort, and accessibility under real conditions of use.",
  },
  {
    slug: "implementation",
    name: "Implementation",
    question: "How is it actually built and deployed?",
    description:
      "Development, integration with clinical systems, and getting it running in a real setting.",
  },
  {
    slug: "validation",
    name: "Clinical validation",
    question: "Does it work, measured properly?",
    description:
      "Usability studies, clinical trials, and outcome measurement against a defined endpoint.",
  },
  {
    slug: "regulatory",
    name: "Regulatory",
    question: "What clearance does it need, and where?",
    description:
      "Device classification, submissions, and quality systems. Region- and date-specific.",
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    question: "How is it produced at scale?",
    description:
      "Hardware production, supply chain, and the quality controls that regulated devices require.",
  },
  {
    slug: "commercialization",
    name: "Commercialization",
    question: "How does it reach the people who need it?",
    description:
      "Reimbursement, procurement, distribution, and getting a health system to adopt it.",
  },
];

export function getStage(slug: string) {
  return stages.find((stage) => stage.slug === slug);
}

export const stageLabels: Record<PipelineStage, string> = Object.fromEntries(
  stages.map((stage) => [stage.slug, stage.name]),
) as Record<PipelineStage, string>;

export function getStageEntities(slug: PipelineStage) {
  return catalog.filter((entity) => entity.stages?.includes(slug));
}

const stageKindOrder: EntityKind[] = [
  "problem",
  "solution",
  "organization",
  "evidence",
  "project",
  "event",
  "group",
];

export function getStageEntitiesByKind(slug: PipelineStage) {
  const entities = getStageEntities(slug);
  return stageKindOrder
    .map((kind) => ({ kind, items: entities.filter((entity) => entity.kind === kind) }))
    .filter((group) => group.items.length > 0);
}

/** Technical problems: anchored to a stage rather than a clinical topic. */
export function getTechnicalProblems(slug: PipelineStage) {
  return getStageEntities(slug).filter(
    (entity) => entity.kind === "problem" && !entity.topicSlug,
  );
}

export function getStagesForEntity(entity: CatalogEntity) {
  return stages.filter((stage) => entity.stages?.includes(stage.slug));
}
