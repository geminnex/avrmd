"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountMenu } from "./account-menu";

type Me = { displayName: string | null; email: string; handle: string | null } | null;

/**
 * Renders "Sign in" on first paint (matching the static HTML every visitor
 * gets) and swaps to the account menu after a client-side check — the price
 * of keeping every catalog and topic page fully static instead of forcing
 * server-rendered auth into pages that don't otherwise need a database.
 */
export function AccountSlot() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((payload) => {
        if (!cancelled) setMe(payload.user);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (me) return <AccountMenu handle={me.handle} label={me.displayName || me.email} />;

  return (
    <Link className="signin-button" href="/sign-in">
      Sign in
    </Link>
  );
}
