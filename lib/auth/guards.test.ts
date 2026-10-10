import { describe, expect, it } from "vitest";
import { isCrossSite, safeNextPath, validateGoogleIdToken } from "./guards";

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/questions/abc?x=1")).toBe("/questions/abc?x=1");
  });

  it.each([
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example",
    "javascript:alert(1)",
    "/api/auth/sign-out",
    "/ok\nSet-Cookie: x",
    undefined,
    42,
  ])("falls back to home for %s", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });
});

describe("isCrossSite", () => {
  const request = (origin?: string) =>
    new Request("https://avrmd.cyalin.com/api/x", {
      method: "POST",
      headers: origin ? { origin } : {},
    });

  it("allows this site and non-browser clients, refuses other sites", () => {
    process.env.AUTH_URL = "https://avrmd.cyalin.com";
    expect(isCrossSite(request("https://avrmd.cyalin.com"))).toBe(false);
    expect(isCrossSite(request())).toBe(false);
    expect(isCrossSite(request("https://other.cyalin.com"))).toBe(true);
  });
});

describe("validateGoogleIdToken", () => {
  const now = 1_800_000_000_000;
  const token = (claims: Record<string, unknown>) =>
    `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;
  const good = {
    iss: "https://accounts.google.com",
    aud: "client-1",
    exp: now / 1000 + 300,
    nonce: "n1",
    sub: "1234",
    email: "Doc@Example.org",
    email_verified: true,
    name: "Dr Example",
  };
  const expected = { clientId: "client-1", nonce: "n1", now };

  it("accepts a well-formed token and normalises the email", () => {
    expect(validateGoogleIdToken(token(good), expected)).toEqual({
      sub: "1234",
      email: "doc@example.org",
      name: "Dr Example",
    });
  });

  it.each([
    ["wrong issuer", { iss: "https://evil.example" }],
    ["wrong audience", { aud: "someone-else" }],
    ["expired", { exp: now / 1000 - 1 }],
    ["replayed nonce", { nonce: "other" }],
    ["unverified email", { email_verified: false }],
  ])("rejects %s", (_, override) => {
    expect(validateGoogleIdToken(token({ ...good, ...override }), expected)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(validateGoogleIdToken("not-a-jwt", expected)).toBeNull();
    expect(validateGoogleIdToken(undefined, expected)).toBeNull();
  });
});
