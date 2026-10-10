import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and nothing else", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(stored).not.toContain("correct");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterY", stored)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", "md5$abc")).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same password here")).not.toBe(await hashPassword("same password here"));
  });
});

describe("password rules", () => {
  const email = "jane.doe@hospital.org";
  it.each([
    ["short", "short1"],
    ["common", "password123"],
    ["contains the email name", "jane.doe-2026!"],
    ["repetitive", "aaaaaaaaaaab"],
  ])("rejects %s", (_, password) => {
    expect(passwordProblem(password, email)).not.toBeNull();
  });

  it("accepts a long passphrase", () => {
    expect(passwordProblem("tissue registration drift", email)).toBeNull();
  });
});
