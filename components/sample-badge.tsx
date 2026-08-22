/** Marks fabricated illustrative content so it is never mistaken for real data. */
export function SampleBadge({ label = "Sample" }: { label?: string }) {
  return <span className="sample-badge">{label}</span>;
}
