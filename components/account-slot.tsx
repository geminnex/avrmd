"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountMenu } from "./account-menu";
import { NotificationBell } from "./notification-bell";

type Me = {
  displayName: string | null;
  email: string;
  handle: string | null;
  unreadNotifications?: number;
} | null;

/**
 * Renders "Sign in" on first paint (matching the static HTML every visitor
 * gets) and swaps to the account menu after a client-side check — the price
 * of keeping every catalog and topic page fully static instead of forcing
 * server-rendered auth into pages that don't otherwise need a database.
 *
 * Re-checks when the tab comes back into view, so the bell picks up
 * notifications that arrived while someone was elsewhere.
 */
export function AccountSlot() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/auth/me")
        .then((response) => (response.ok ? response.json() : { user: null }))
        .then((payload) => {
          if (!cancelled) setMe(payload.user);
        })
        .catch(() => undefined);

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (me) {
    return (
      <>
        <NotificationBell unread={me.unreadNotifications ?? 0} />
        <AccountMenu handle={me.handle} label={me.displayName || me.email} />
      </>
    );
  }

  return (
    <Link className="signin-button" href="/sign-in">
      Sign in
    </Link>
  );
}
