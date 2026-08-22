import { describe, expect, it } from "vitest";
import { getFeed } from "./feed";

describe("feed", () => {
  it("orders items newest first", () => {
    const items = getFeed(50);
    for (let i = 1; i < items.length; i += 1) {
      expect(items[i - 1].date >= items[i].date).toBe(true);
    }
  });

  it("respects the limit across all sources combined", () => {
    expect(getFeed(5)).toHaveLength(5);
  });

  it("never mixes a feed item's kind with the wrong data shape", () => {
    for (const item of getFeed(50)) {
      if (item.kind === "signal") expect(item.data).toHaveProperty("url");
      if (item.kind === "record") expect(item.data).toHaveProperty("reviewStatus");
      if (item.kind === "discussion") expect(item.data).toHaveProperty("sample", true);
      if (item.kind === "opportunity") expect(item.data).toHaveProperty("kind");
    }
  });

  it("excludes problems from the record feed", () => {
    // Problems are clinical-topic content, not "database additions" news.
    const records = getFeed(100).filter((item) => item.kind === "record");
    expect(records.every((item) => item.data.kind !== "problem")).toBe(true);
  });
});
