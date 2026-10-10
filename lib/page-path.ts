const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Pages that are private or carry tokens never get counted.
const skipped = /^\/(api|settings|notifications|sign-in)(\/|$)/;

// Only real sections of the site: a made-up path can't add rows.
const sections = new Set([
  "", "explore", "topics", "stages", "talks", "members", "questions", "ask", "clearances",
  "signals", "gear", "resources", "entities", "problems", "network", "posts",
  "for-organizations", "participate", "about", "privacy", "terms", "opportunities",
]);

/**
 * Turns a reported path into the bucket it is counted under, or null when it
 * should not be counted. Ids and handles collapse into placeholders so the
 * table can't be used to learn who viewed what, and can't grow unbounded.
 */
export function normalizePagePath(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 200 || !input.startsWith("/") || input.startsWith("//")) {
    return null;
  }
  let path = input.split("#")[0].split("?")[0];
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (!path.startsWith("/") || skipped.test(path)) return null;
  if (!sections.has(path.split("/")[1] ?? "")) return null;

  return path
    .replace(new RegExp(`^/questions/${uuid}$`, "i"), "/questions/[id]")
    .replace(new RegExp(`^/posts/${uuid}$`, "i"), "/posts/[id]")
    .replace(/^\/members\/[^/]+$/, "/members/[handle]");
}
