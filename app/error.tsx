"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Unplug } from "lucide-react";

/**
 * Shown when a page fails on the server — most often the database being
 * briefly unreachable. Everything else on the site keeps working, and the
 * failure is already logged server-side (instrumentation.ts).
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="not-found">
      <Unplug size={56} />
      <span className="eyebrow">Temporarily unavailable</span>
      <h1>This page couldn&apos;t load just now.</h1>
      <p>
        The rest of AVRMD still works. Try again in a moment.
        {error.digest ? ` (reference ${error.digest})` : ""}
      </p>
      <div className="error-actions">
        <button className="button-primary" onClick={() => reset()} type="button">
          <RotateCcw size={16} />
          Try again
        </button>
        <Link className="button-secondary" href="/">
          Home
        </Link>
      </div>
    </section>
  );
}
