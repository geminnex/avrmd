import { describe, expect, it } from "vitest";
import { getEntity } from "./catalog";
import { communityThreads, getThreadsByTopic, getThreadsForTopic } from "./community";
import { getTopic, topics } from "./topics";

describe("community threads", () => {
  it("keeps slugs unique", () => {
    const slugs = communityThreads.map((thread) => thread.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("resolves every topic and related record", () => {
    for (const thread of communityThreads) {
      expect(getTopic(thread.topicSlug), thread.slug).toBeDefined();
      for (const slug of thread.relatedEntitySlugs) {
        expect(getEntity(slug), `${thread.slug} → ${slug}`).toBeDefined();
      }
    }
  });

  it("marks all seeded content as sample and never invents a person", () => {
    for (const thread of communityThreads) {
      expect(thread.sample, thread.slug).toBe(true);
      expect(thread.posts.length).toBeGreaterThan(0);
      for (const post of thread.posts) {
        // Roles, not names: a comma would suggest "Name, Title".
        expect(post.role, thread.slug).not.toMatch(/,/);
        expect(post.body.length).toBeGreaterThan(40);
      }
    }
  });

  it("demonstrates owner-reply labelling exactly once", () => {
    const official = communityThreads.flatMap((thread) =>
      thread.posts.filter((post) => post.official),
    );
    expect(official).toHaveLength(1);
  });

  it("gives every topic at least one thread", () => {
    for (const topic of topics) {
      expect(getThreadsForTopic(topic.slug).length, topic.slug).toBeGreaterThan(0);
    }
    expect(getThreadsByTopic()).toHaveLength(topics.length);
  });
});
