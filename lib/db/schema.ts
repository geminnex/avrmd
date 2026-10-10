import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const entityKind = pgEnum("entity_kind", [
  "problem",
  "organization",
  "solution",
  "evidence",
  "event",
  "project",
  "group",
]);

export const publicationStatus = pgEnum("publication_status", [
  "draft",
  "in_review",
  "published",
  "archived",
]);

export const workflowStatus = pgEnum("workflow_status", [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "withdrawn",
]);

export const memberRole = pgEnum("member_role", [
  "member",
  "owner",
  "editor",
  "moderator",
  "administrator",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    handle: text("handle"),
    displayName: text("display_name"),
    bio: text("bio"),
    role: memberRole("role").notNull().default("member"),
    // Declarations, all drawn from the site's existing vocabularies so a
    // person is reachable from the same filters as a record. Text arrays
    // rather than join tables: the vocabularies live in files, not Postgres,
    // so there is nothing to point a foreign key at. See lib/member-profile.ts.
    roles: jsonb("roles").$type<string[]>().notNull().default([]),
    stages: jsonb("stages").$type<string[]>().notNull().default([]),
    canHelpWith: jsonb("can_help_with").$type<string[]>().notNull().default([]),
    lookingFor: jsonb("looking_for").$type<string[]>().notNull().default([]),
    topicInterests: jsonb("topic_interests").$type<string[]>().notNull().default([]),
    /** A catalog organization slug — loose, like posts.entitySlug. */
    affiliationSlug: text("affiliation_slug"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    /** scrypt hash ("scrypt$N$r$p$salt$hash"); null for Google-only accounts. */
    passwordHash: text("password_hash"),
    /** Google's stable account id (`sub`), once someone signs in with Google. */
    googleSub: text("google_sub"),
    profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_handle_unique").on(table.handle),
    uniqueIndex("users_google_sub_unique").on(table.googleSub),
  ],
);

export const tokenPurpose = pgEnum("token_purpose", [
  // Emailed one-time sign-in link (still accepted; no longer offered).
  "sign_in",
  // Proves a newly registered address.
  "verify_email",
  // Sets a new password.
  "reset_password",
]);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    purpose: tokenPurpose("purpose").notNull().default("sign_in"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("verification_tokens_hash_unique").on(table.tokenHash),
    index("verification_tokens_email_idx").on(table.email),
  ],
);

/**
 * DB-backed sessions rather than a signed-only cookie: a row can be revoked
 * (sign-out, or a future "sign out everywhere") without needing a token
 * denylist.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const followingType = pgEnum("following_type", ["user", "entity"]);

/**
 * `followingId` is a loose text reference, not a foreign key: a `user`
 * target is a users.id (uuid, stored as text); an `entity` target is a
 * catalog slug from data/catalog.json. The catalog is deliberately flat
 * JSON, not the (unpopulated) `entities` table below, so following an entity
 * has nothing in Postgres to key against — same pattern already used for
 * `entitySlug` on private inquiries and `promotedSlug` on signals.
 */
export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingType: followingType("following_type").notNull(),
    followingId: text("following_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("follows_unique").on(
      table.followerId,
      table.followingType,
      table.followingId,
    ),
    index("follows_target_idx").on(table.followingType, table.followingId),
  ],
);

export const postKind = pgEnum("post_kind", ["update", "blog"]);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Null: a personal post. Set: posted on behalf of a claimed organisation
    // — a catalog slug, not a Postgres FK, for the same reason `follows`
    // references entities loosely (see above). Enforcing that the author
    // actually has standing to post as this entity is application logic
    // (organization_memberships), not a constraint the DB can express here.
    entitySlug: text("entity_slug"),
    kind: postKind("kind").notNull().default("update"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("posts_author_idx").on(table.authorId, table.createdAt),
    index("posts_entity_idx").on(table.entitySlug, table.createdAt),
  ],
);

export const postMedia = pgTable(
  "post_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("post_media_post_idx").on(table.postId)],
);

export const postLikes = pgTable(
  "post_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("post_likes_unique").on(table.postId, table.userId)],
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("post_comments_post_idx").on(table.postId, table.createdAt)],
);

export const talkStatus = pgEnum("talk_status", ["visible", "hidden"]);

/**
 * Member-submitted talks. Curated talks live in `data/talks.json`; both are
 * external links rendered side by side, distinguished by their source label.
 * Tags are stored as text arrays because they reference the file-based
 * vocabulary (topics, stages, facets), which Postgres has no table for.
 */
export const talks = pgTable(
  "talks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    speakers: jsonb("speakers").$type<string[]>().notNull().default([]),
    url: text("url").notNull(),
    hostLabel: text("host_label").notNull(),
    topicSlugs: jsonb("topic_slugs").$type<string[]>().notNull().default([]),
    stages: jsonb("stages").$type<string[]>().notNull().default([]),
    facets: jsonb("facets").$type<string[]>().notNull().default([]),
    // Submissions are live on arrival; `hidden` is the takedown path until a
    // moderation queue exists.
    status: talkStatus("status").notNull().default("visible"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("talks_slug_idx").on(table.slug),
    index("talks_status_idx").on(table.status, table.createdAt),
    index("talks_submitter_idx").on(table.submittedBy),
  ],
);

export const qaStatus = pgEnum("qa_status", ["visible", "hidden"]);

/**
 * Member questions — the hallway conversation. Tagged with the same
 * file-based vocabularies as talks and profiles (hence text arrays), because
 * those tags are what route a question to the members who said they can
 * help with it. See lib/questions.ts.
 */
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    topicSlugs: jsonb("topic_slugs").$type<string[]>().notNull().default([]),
    stages: jsonb("stages").$type<string[]>().notNull().default([]),
    facets: jsonb("facets").$type<string[]>().notNull().default([]),
    // No FK: answers reference questions, and a cycle buys nothing here —
    // the accept route checks the answer belongs to this question.
    acceptedAnswerId: uuid("accepted_answer_id"),
    // Live on arrival; `hidden` is the takedown path until moderation exists.
    status: qaStatus("status").notNull().default("visible"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("questions_status_idx").on(table.status, table.createdAt),
    index("questions_author_idx").on(table.authorId),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: qaStatus("status").notNull().default("visible"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("answers_question_idx").on(table.questionId, table.createdAt)],
);

export const notificationKind = pgEnum("notification_kind", [
  // A question matched what you said you can help with.
  "question_routed",
  // Someone answered your question.
  "answer_posted",
  // Your answer was marked as the one that helped.
  "answer_accepted",
]);

/**
 * In-app only for now. `reason` records why it was sent (the matched tags),
 * so a recipient can always see what they declared that caused it.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    answerId: uuid("answer_id").references(() => answers.id, { onDelete: "cascade" }),
    reason: jsonb("reason").$type<{ matched?: string[] }>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId, table.createdAt),
    // Re-accepting the same answer, or a retried request, must not notify twice.
    unique("notifications_dedupe")
      .on(table.userId, table.kind, table.questionId, table.answerId)
      .nullsNotDistinct(),
  ],
);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: entityKind("kind").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    status: publicationStatus("status").notNull().default("draft"),
    claimed: boolean("claimed").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("entities_slug_unique").on(table.slug),
    index("entities_kind_status_idx").on(table.kind, table.status),
  ],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    definition: text("definition").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("topics_slug_unique").on(table.slug)],
);

export const entityRelations = pgTable(
  "entity_relations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromEntityId: uuid("from_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    toEntityId: uuid("to_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    sourceId: uuid("source_id").references(() => sourceRecords.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("entity_relations_unique").on(
      table.fromEntityId,
      table.toEntityId,
      table.relationType,
    ),
  ],
);

export const sourceRecords = pgTable(
  "source_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    publisher: text("publisher").notNull(),
    rightsBasis: text("rights_basis").notNull(),
    licenseUrl: text("license_url"),
    sourceFingerprint: text("source_fingerprint"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("source_records_entity_idx").on(table.entityId)],
);

export const entityTopics = pgTable(
  "entity_topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => sourceRecords.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("entity_topics_unique").on(table.entityId, table.topicId),
    index("entity_topics_topic_idx").on(table.topicId, table.entityId),
  ],
);

export const fieldProvenance = pgTable(
  "field_provenance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    fieldPath: text("field_path").notNull(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sourceRecords.id, { onDelete: "restrict" }),
    extractionMethod: text("extraction_method").notNull(),
    reviewedById: uuid("reviewed_by_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("field_provenance_unique").on(
      table.entityId,
      table.fieldPath,
      table.sourceId,
    ),
  ],
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id),
    status: workflowStatus("status").notNull().default("draft"),
    patch: jsonb("patch").$type<Record<string, unknown>>().notNull(),
    rationale: text("rationale").notNull(),
    reviewedById: uuid("reviewed_by_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("content_revisions_entity_status_idx").on(table.entityId, table.status)],
);

export const catalogSubmissions = pgTable(
  "catalog_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submitterId: uuid("submitter_id").references(() => users.id),
    kind: entityKind("kind").notNull(),
    proposedName: text("proposed_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    rightsBasis: text("rights_basis").notNull(),
    status: workflowStatus("status").notNull().default("submitted"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("catalog_submissions_status_idx").on(table.status, table.createdAt)],
);

/**
 * Never populated before this change (0 rows), so retargeting it from a
 * `entities` table FK to a catalog slug costs nothing and matches every
 * other entity reference added this session (`follows`, `posts.entitySlug`)
 * — the catalog lives in flat JSON, not in the `entities` table below.
 */
export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entitySlug: text("entity_slug").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organization_memberships_unique").on(table.entitySlug, table.userId),
  ],
);

export const ownershipClaims = pgTable(
  "ownership_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    claimantId: uuid("claimant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workEmailDomain: text("work_email_domain").notNull(),
    relationship: text("relationship").notNull(),
    status: workflowStatus("status").notNull().default("submitted"),
    evidenceExpiresAt: timestamp("evidence_expires_at", { withTimezone: true }),
    reviewedById: uuid("reviewed_by_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ownership_claims_status_idx").on(table.status, table.createdAt)],
);

/**
 * Never populated before this change (0 rows) — retargeted from an
 * `entities` table FK to a catalog slug for the same reason `follows`,
 * `posts`, and `organization_memberships` all made the same switch: the
 * catalog lives in flat JSON, not in the `entities` table below.
 */
export const communityThreads = pgTable(
  "community_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entitySlug: text("entity_slug").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadType: text("thread_type").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("community_threads_entity_idx").on(table.entitySlug, table.updatedAt)],
);

export const communityPosts = pgTable(
  "community_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => communityThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    isOfficial: boolean("is_official").notNull().default(false),
    moderationState: text("moderation_state").notNull().default("visible"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("community_posts_thread_idx").on(table.threadId, table.createdAt)],
);

export const privateInquiries = pgTable(
  "private_inquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedMembershipId: uuid("assigned_membership_id").references(
      () => organizationMemberships.id,
    ),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("private_inquiries_entity_status_idx").on(table.entityId, table.status)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationEntityId: uuid("organization_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "restrict" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    status: workflowStatus("status").notNull().default("draft"),
    budgetMinor: integer("budget_minor"),
    currency: text("currency").notNull().default("USD"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    invoiceStatus: text("invoice_status").notNull().default("not_issued"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("campaigns_status_schedule_idx").on(table.status, table.startsAt)],
);

export const campaignCreatives = pgTable(
  "campaign_creatives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    headline: text("headline").notNull(),
    body: text("body").notNull(),
    destinationUrl: text("destination_url").notNull(),
    disclosureLabel: text("disclosure_label").notNull().default("Sponsored"),
    reviewStatus: workflowStatus("review_status").notNull().default("submitted"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("campaign_creatives_campaign_idx").on(table.campaignId)],
);

export const campaignPlacements = pgTable(
  "campaign_placements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => campaignCreatives.id, { onDelete: "cascade" }),
    placementType: text("placement_type").notNull(),
    contextEntityId: uuid("context_entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("scheduled"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("campaign_placements_campaign_idx").on(table.campaignId, table.status),
    index("campaign_placements_schedule_idx").on(table.status, table.startsAt, table.endsAt),
    index("campaign_placements_context_idx").on(table.contextEntityId, table.status),
  ],
);

export const deliveryEvents = pgTable(
  "delivery_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placementId: uuid("placement_id")
      .notNull()
      .references(() => campaignPlacements.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    sessionHash: text("session_hash"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("delivery_events_placement_idx").on(table.placementId, table.occurredAt),
    index("delivery_events_type_idx").on(table.eventType, table.occurredAt),
  ],
);

export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestedById: uuid("requested_by_id").references(() => users.id),
    jobType: text("job_type").notNull(),
    sourceUrl: text("source_url"),
    rightsBasis: text("rights_basis"),
    status: text("status").notNull().default("queued"),
    promptVersion: text("prompt_version").notNull(),
    schemaVersion: text("schema_version").notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_jobs_status_idx").on(table.status, table.createdAt)],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => aiJobs.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    zeroDataRetention: boolean("zero_data_retention").notNull().default(false),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    result: jsonb("result").$type<Record<string, unknown>>(),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_runs_job_idx").on(table.jobId, table.createdAt)],
);

export const aiSuggestions = pgTable(
  "ai_suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => aiRuns.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").references(() => entities.id, { onDelete: "cascade" }),
    fieldPath: text("field_path").notNull(),
    proposedValue: jsonb("proposed_value").notNull(),
    citations: jsonb("citations").$type<string[]>().notNull().default([]),
    status: workflowStatus("status").notNull().default("in_review"),
    reviewedById: uuid("reviewed_by_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_suggestions_status_idx").on(table.status, table.createdAt)],
);

export const moderationReports = pgTable(
  "moderation_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id").references(() => users.id),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: workflowStatus("status").notNull().default("submitted"),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("moderation_reports_status_idx").on(table.status, table.createdAt)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_events_resource_idx").on(table.resourceType, table.resourceId)],
);

export const contributionKind = pgEnum("contribution_kind", [
  "submission",
  "claim",
  "advertising",
  "inquiry",
]);

/**
 * Everything people send the editors (or, for an inquiry, a record's verified
 * representatives) through the site's forms. One table rather than one per
 * form: until the review screen exists, these are read from email and here.
 */
export const contributions = pgTable(
  "contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: contributionKind("kind").notNull(),
    entitySlug: text("entity_slug"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: workflowStatus("status").notNull().default("submitted"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("contributions_status_idx").on(table.status, table.createdAt)],
);

/**
 * Fixed-window request counters, shared by every server process and kept
 * across restarts (the in-memory limiters reset on each deploy). One row per
 * limiter key; rows older than a day are swept opportunistically.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  hits: integer("hits").notNull(),
});

/**
 * Anonymous page-view counters: one row per page per UTC day. Nothing about
 * the visitor (IP, device, cookie) is ever stored, only how often a page was
 * opened.
 */
export const pageViews = pgTable(
  "page_views",
  {
    day: date("day").notNull(),
    path: text("path").notNull(),
    views: integer("views").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.day, table.path] })],
);
