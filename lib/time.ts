/** Hour-level: "just now", "5h ago", "3d ago". For posts, questions, notifications. */
export function timeAgo(date: Date | string) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * Day-level: "today", "yesterday", "12d ago", "3mo ago". For discovery dates.
 * Accepts date-only strings ("2026-10-10") as well as full timestamps.
 */
export function daysAgo(value: string | Date) {
  const date =
    typeof value === "string" && value.length <= 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);
  const days = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}
