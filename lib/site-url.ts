/** Public origin of the site, without a trailing slash. */
export function siteUrl() {
  return (process.env.AUTH_URL || "https://avrmd.cyalin.com").replace(/\/+$/, "");
}
