import { stageLabels } from "../stages";
import { topics } from "../topics";
import type { PipelineStage } from "../catalog-types";
import type { CorpusItem } from "./retrieve";

/**
 * Next steps the assistant may offer. Built here from what the question is
 * about; the model may only choose among them by id, so every link it shows
 * is one the site generated and every feature it suggests exists.
 */
export type AssistantAction = { id: string; label: string; href: string };

export function buildActions(context: {
  facets: string[];
  stages: string[];
  topicSlugs: string[];
  helperCount: number;
  items: Pick<CorpusItem, "type">[];
  query: string;
}): AssistantAction[] {
  const actions: AssistantAction[] = [];
  const facet = context.facets[0];
  const stage = context.stages[0] as PipelineStage | undefined;
  const topic = topics.find((item) => item.slug === context.topicSlugs[0]);
  const has = (type: CorpusItem["type"]) => context.items.some((item) => item.type === type);

  if (facet && context.helperCount > 0) {
    actions.push({
      id: "members",
      label: `${context.helperCount} ${context.helperCount === 1 ? "member says they" : "members say they"} can help with ${facet}`,
      href: `/members?help=${encodeURIComponent(facet)}`,
    });
  }

  const ask = new URLSearchParams();
  context.facets.slice(0, 3).forEach((value) => ask.append("facet", value));
  context.stages.slice(0, 2).forEach((value) => ask.append("stage", value));
  context.topicSlugs.slice(0, 1).forEach((value) => ask.append("topic", value));
  actions.push({
    id: "ask",
    label: context.helperCount > 0 ? "Ask the members who can help" : "Post this as a question to the community",
    href: ask.toString() ? `/ask?${ask}` : "/ask",
  });

  if (stage) {
    actions.push({
      id: "stage",
      label: `${stageLabels[stage]} stage: what is hard and who works on it`,
      href: `/stages/${stage}`,
    });
  }
  if (topic) {
    actions.push({ id: "topic", label: `${topic.shortName}: the full topic hub`, href: `/topics/${topic.slug}` });
  }
  if (has("fda") || stage === "regulatory") {
    actions.push({
      id: "clearances",
      label: "Search FDA-authorized AR/VR devices",
      href: facet ? `/clearances?q=${encodeURIComponent(facet)}` : "/clearances",
    });
  }
  if (has("question")) {
    actions.push({
      id: "questions",
      label: "Read what members have already asked",
      href: facet ? `/questions?facet=${encodeURIComponent(facet)}` : "/questions",
    });
  }
  if (has("talk")) {
    actions.push({
      id: "talks",
      label: "Watch related talks",
      href: topic ? `/talks?topic=${topic.slug}` : stage ? `/talks?stage=${stage}` : "/talks",
    });
  }
  if (has("signal")) {
    actions.push({ id: "signals", label: "Latest papers, trials and news", href: "/signals" });
  }
  return actions;
}
