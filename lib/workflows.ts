import { z } from "zod";
import { entityKinds } from "./catalog-types";

const email = z.string().trim().email().max(254);
const shortText = z.string().trim().min(2).max(160);
const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "Use an HTTP or HTTPS URL.");

const submissionRequest = z.object({
  type: z.literal("submission"),
  name: shortText,
  kind: z.enum(entityKinds),
  sourceUrl: httpsUrl,
  rightsBasis: z.string().trim().min(10).max(500),
  contactEmail: email,
  attestation: z.literal(true),
});

const claimRequest = z.object({
  type: z.literal("claim"),
  entityName: shortText,
  workEmail: email,
  role: shortText,
  relationship: z.string().trim().min(10).max(500),
  attestation: z.literal(true),
});

const advertisingRequest = z.object({
  type: z.literal("advertising"),
  organizationName: shortText,
  contactEmail: email,
  campaignGoal: z.string().trim().min(10).max(500),
  destinationUrl: httpsUrl,
  budgetBand: z.enum(["under-2500", "2500-10000", "over-10000"]),
  attestation: z.literal(true),
});

const inquiryRequest = z.object({
  type: z.literal("inquiry"),
  entitySlug: z.string().trim().min(2).max(180),
  senderName: shortText,
  senderEmail: email,
  organization: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(20).max(1500),
  noPhi: z.literal(true),
});


export const intakeSchema = z.discriminatedUnion("type", [
  submissionRequest,
  claimRequest,
  advertisingRequest,
  inquiryRequest,
]);

export type IntakeRequest = z.infer<typeof intakeSchema>;
export type IntakeType = IntakeRequest["type"];

export const intakeLabels: Record<IntakeType, string> = {
  submission: "Catalog submission",
  claim: "Ownership claim",
  advertising: "Campaign request",
  inquiry: "Private inquiry",
};

export function validateIntake(input: unknown) {
  return intakeSchema.safeParse(input);
}
