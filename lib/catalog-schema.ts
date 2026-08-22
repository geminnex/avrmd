import { z } from "zod";
import { entityKinds, solutionSubtypes } from "./catalog-types";

/**
 * Validates records written into data/catalog.json. Used by the discovery and
 * approval scripts and by the catalog test — not at runtime, where the file is
 * a typed import.
 */
export const catalogEntitySchema = z.object({
  id: z.string().min(2),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase and hyphenated"),
  name: z.string().min(2),
  kind: z.enum(entityKinds),
  typeLabel: z.string().min(2),
  owner: z.string().min(1).optional(),
  summary: z.string().min(20),
  modalities: z.array(z.string().min(1)).min(1),
  specialties: z.array(z.string().min(1)).min(1),
  useCases: z.array(z.string().min(1)).min(1),
  geography: z.string().min(2),
  stage: z.string().min(2),
  reviewStatus: z.enum(["source-reviewed", "metadata-reviewed", "needs-review"]),
  claimStatus: z.enum(["claimed", "unclaimed", "not-claimable"]),
  aiAssisted: z.boolean(),
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceUrl: z.string().url().startsWith("https://"),
  sourceLabel: z.string().min(3),
  sourceNote: z.string().min(10),
  accent: z.enum(["teal", "blue", "violet", "coral", "gold"]),
  featured: z.boolean().optional(),
  regulatoryNote: z.string().optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  relatedSlugs: z.array(z.string()),
  subtype: z.enum(solutionSubtypes).optional(),
  topicSlug: z.string().optional(),
});

export const catalogSchema = z.array(catalogEntitySchema);
