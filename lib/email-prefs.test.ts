import { beforeAll, describe, expect, it } from "vitest";
import { unsubscribeHeaders, unsubscribeToken, verifyUnsubscribeToken } from "./email-prefs";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret";
  process.env.AUTH_URL = "https://avrmd.cyalin.com";
});

describe("unsubscribe tokens", () => {
  const user = "11111111-1111-1111-1111-111111111111";
  it("only work for the member and kind they were made for", () => {
    const token = unsubscribeToken(user, "digest");
    expect(verifyUnsubscribeToken(user, "digest", token)).toBe(true);
    expect(verifyUnsubscribeToken(user, "answers", token)).toBe(false);
    expect(verifyUnsubscribeToken("22222222-2222-2222-2222-222222222222", "digest", token)).toBe(false);
    expect(verifyUnsubscribeToken(user, "everything", token)).toBe(false);
    expect(verifyUnsubscribeToken(user, "digest", "forged")).toBe(false);
  });
  it("sets one-click headers", () => {
    const headers = unsubscribeHeaders(user, "questions");
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(headers["List-Unsubscribe"]).toMatch(/^<https:\/\/avrmd\.cyalin\.com\/api\/email\/unsubscribe\?u=/);
  });
});
