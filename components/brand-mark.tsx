export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup" aria-label="AVRMD">
      <span className="brand-glyph" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact && <span className="brand-word">AVRMD</span>}
    </span>
  );
}

