import Link from "next/link";
import { Info } from "lucide-react";

/**
 * The single preview posture for the whole site. Pages state what a surface
 * will do and what it does today — the detail of why lives at /about#status,
 * so no page repeats the infrastructure explanation.
 */
export function PreviewNote({
  title = "Preview",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="preview-note">
      <Info size={17} />
      <p>
        <strong>{title}.</strong> {children}{" "}
        <Link href="/about#status">What is live today</Link>
      </p>
    </div>
  );
}
