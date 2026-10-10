/**
 * Runs once when the server starts, before it takes requests: reports
 * configuration problems to the service log (journalctl -u avrmd.service).
 * It warns rather than refusing to start, so a typo can't take the site down.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnv } = await import("./lib/env-check");
  const { errors, warnings } = checkEnv(process.env, process.env.NODE_ENV === "production");
  for (const error of errors) console.error(`[env] ERROR ${error}`);
  for (const warning of warnings) console.warn(`[env] warning ${warning}`);
  if (errors.length === 0 && warnings.length === 0) console.log("[env] configuration ok");
}

/** One line per unhandled server error, so failures are findable in the journal. */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string },
) {
  const { message, digest } = error as { message?: string; digest?: string };
  console.error(
    `[error] ${request.method} ${request.path} (${context.routeType} ${context.routePath})${digest ? ` digest=${digest}` : ""}: ${message ?? String(error)}`,
  );
}
