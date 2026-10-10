import { describe, expect, it } from "vitest";
import { toggleParam } from "./url";
import { daysAgo, timeAgo } from "./time";

describe("time labels", () => {
  const ago = (ms: number) => new Date(Date.now() - ms);
  it("counts minutes, hours and days", () => {
    expect(timeAgo(ago(10_000))).toBe("just now");
    expect(timeAgo(ago(5 * 60_000))).toBe("5m ago");
    expect(timeAgo(ago(3 * 3_600_000))).toBe("3h ago");
    expect(timeAgo(ago(2 * 86_400_000))).toBe("2d ago");
  });
  it("handles date-only strings and long spans", () => {
    expect(daysAgo(new Date().toISOString().slice(0, 10))).toMatch(/today|yesterday/);
    expect(daysAgo(ago(86_400_000))).toBe("yesterday");
    expect(daysAgo(ago(90 * 86_400_000))).toBe("3mo ago");
  });
});

describe("toggleParam", () => {
  it("sets, replaces and clears a filter", () => {
    expect(toggleParam("/q", {}, "stage", "design")).toBe("/q?stage=design");
    expect(toggleParam("/q", { stage: "design", topic: "pain" }, "stage", "design")).toBe("/q?topic=pain");
    expect(toggleParam("/q", { stage: "design" }, "stage")).toBe("/q");
  });
});
