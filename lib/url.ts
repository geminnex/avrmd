/**
 * A filter link: sets `key` to `value`, or clears it when it is already
 * that value (clicking an active chip turns it off). Empty values are dropped.
 */
export function toggleParam(
  base: string,
  current: Record<string, string | undefined>,
  key: string,
  value?: string,
) {
  const next = { ...current };
  if (!value || next[key] === value) delete next[key];
  else next[key] = value;
  const params = new URLSearchParams(
    Object.entries(next).filter(([, item]) => Boolean(item)) as [string, string][],
  );
  const encoded = params.toString();
  return encoded ? `${base}?${encoded}` : base;
}
