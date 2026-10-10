import { describe, expect, it } from "vitest";
import { normalizePagePath } from "./page-path";

describe("normalizePagePath", () => {
  it("strips query string and hash", () => {
    expect(normalizePagePath("/entities/osso-vr?x=1#top")).toBe("/entities/osso-vr");
  });

  it("keeps the root and trims trailing slashes", () => {
    expect(normalizePagePath("/")).toBe("/");
    expect(normalizePagePath("/about/")).toBe("/about");
    expect(normalizePagePath("/?ref=x")).toBe("/");
  });

  it("collapses ids and handles", () => {
    expect(normalizePagePath("/questions/0f8fad5b-d9cb-469f-a165-70867728950e")).toBe("/questions/[id]");
    expect(normalizePagePath("/posts/0F8FAD5B-D9CB-469F-A165-70867728950E")).toBe("/posts/[id]");
    expect(normalizePagePath("/members/jane")).toBe("/members/[handle]");
    expect(normalizePagePath("/members")).toBe("/members");
  });

  it("skips private and api paths", () => {
    for (const path of ["/api/hit", "/settings", "/settings/profile", "/notifications", "/sign-in/confirm", "/sign-in"]) {
      expect(normalizePagePath(path)).toBeNull();
    }
    // Not a section of the site, so not counted either.
    expect(normalizePagePath("/settingsx")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(normalizePagePath("about")).toBeNull();
    expect(normalizePagePath("//evil.com")).toBeNull();
    expect(normalizePagePath("/" + "a".repeat(200))).toBeNull();
    expect(normalizePagePath(42)).toBeNull();
    expect(normalizePagePath(undefined)).toBeNull();
  });

  it("ignores paths outside the site's sections", () => {
    expect(normalizePagePath("/wp-admin/setup.php")).toBeNull();
    expect(normalizePagePath("/random-garbage-123")).toBeNull();
    expect(normalizePagePath("/")).toBe("/");
  });
});
