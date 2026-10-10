/**
 * What is wrong or suspicious in the server's configuration. Run at
 * startup (instrumentation.ts) so a misconfiguration shows up in the
 * service log the moment it happens — twice a setting in /etc/avrmd.env
 * silently overrode the project's own (SMTP, then the assistant key).
 */
export function checkEnv(env: Record<string, string | undefined>, production: boolean) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const set = (key: string) => typeof env[key] === "string" && env[key]!.trim() !== "";

  for (const key of ["DATABASE_URL", "AUTH_URL", "AUTH_SECRET", "S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_PUBLIC_URL"]) {
    if (!set(key)) errors.push(`${key} is not set`);
  }
  if (set("AUTH_SECRET") && env.AUTH_SECRET!.length < 32) errors.push("AUTH_SECRET is shorter than 32 characters");

  // Present but empty: almost always an override that blanks a real value.
  for (const [key, value] of Object.entries(env)) {
    if (/^(SMTP|OPENROUTER|GOOGLE|S3|AUTH|EDITOR|CONTACT)_/.test(key) && value !== undefined && value.trim() === "" && key !== "SMTP_USER" && key !== "SMTP_PASS") {
      warnings.push(`${key} is set but empty — check /etc/avrmd.env for an override`);
    }
  }

  if (production) {
    if (set("AUTH_URL") && !env.AUTH_URL!.startsWith("https://")) errors.push(`AUTH_URL is not https (${env.AUTH_URL})`);
    if (!set("SMTP_HOST")) errors.push("SMTP_HOST is not set: confirmation and reset emails can't be sent");
    else if (/^(localhost|127\.)/.test(env.SMTP_HOST!)) errors.push(`SMTP_HOST is ${env.SMTP_HOST}: production mail would go to a local test server`);
    if (set("SMTP_HOST") && !set("SMTP_USER")) warnings.push("SMTP_USER is not set: most providers refuse unauthenticated mail");
    if (!set("OPENROUTER_API_KEY")) warnings.push("OPENROUTER_API_KEY is not set: Ask AVRMD answers retrieval-only");
    if (env.OPENROUTER_MODEL === "openrouter/free") warnings.push("OPENROUTER_MODEL is openrouter/free, which failed structured-output tests; answers will mostly fall back");
  }
  if (set("GOOGLE_CLIENT_ID") !== set("GOOGLE_CLIENT_SECRET")) {
    warnings.push("Only one of GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET is set: Google sign-in stays off");
  }
  return { errors, warnings };
}
