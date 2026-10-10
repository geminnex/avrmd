import { describe, expect, it } from "vitest";
import { checkEnv } from "./env-check";

const good = {
  DATABASE_URL: "postgresql://x",
  AUTH_URL: "https://avrmd.cyalin.com",
  AUTH_SECRET: "x".repeat(64),
  S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_BUCKET: "avrmd",
  S3_ACCESS_KEY: "a",
  S3_SECRET_KEY: "b",
  S3_PUBLIC_URL: "https://avrmd.cyalin.com/media",
  SMTP_HOST: "smtp.purelymail.com",
  SMTP_USER: "me@avrmd.com",
  OPENROUTER_API_KEY: "sk-1",
  OPENROUTER_MODEL: "anthropic/claude-haiku-5.5",
};

describe("checkEnv", () => {
  it("is quiet for a complete production config", () => {
    expect(checkEnv(good, true)).toEqual({ errors: [], warnings: [] });
  });

  it("catches the two overrides that bit before", () => {
    const { errors, warnings } = checkEnv({ ...good, SMTP_HOST: "localhost", OPENROUTER_API_KEY: "", OPENROUTER_MODEL: "openrouter/free" }, true);
    expect(errors.join()).toMatch(/SMTP_HOST is localhost/);
    expect(warnings.join()).toMatch(/OPENROUTER_API_KEY is set but empty/);
    expect(warnings.join()).toMatch(/openrouter\/free/);
  });

  it("flags missing secrets and half-configured Google", () => {
    const { errors, warnings } = checkEnv({ ...good, AUTH_SECRET: "short", GOOGLE_CLIENT_ID: "id" }, true);
    expect(errors.join()).toMatch(/AUTH_SECRET is shorter/);
    expect(warnings.join()).toMatch(/Google sign-in stays off/);
  });

  it("doesn't demand production mail in development", () => {
    expect(checkEnv({ ...good, SMTP_HOST: "localhost", SMTP_USER: undefined }, false).errors).toEqual([]);
  });
});
