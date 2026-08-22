import Link from "next/link";
import { ArrowRight, Orbit } from "lucide-react";

export default function NotFound() {
  return (
    <section className="not-found">
      <Orbit size={60} />
      <span className="eyebrow">404 — outside the mapped network</span>
      <h1>This record has not been charted.</h1>
      <p>Return to discovery and search the reviewed medical XR catalog.</p>
      <Link href="/explore">
        Explore AVRMD
        <ArrowRight size={17} />
      </Link>
    </section>
  );
}

