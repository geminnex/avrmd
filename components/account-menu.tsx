"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleUserRound, LayoutDashboard, LifeBuoy, LogOut, Settings, UserRound } from "lucide-react";

export function AccountMenu({ label, handle, staff = false }: { label: string; handle: string | null; staff?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="account-menu" ref={ref}>
      <button
        aria-expanded={open}
        aria-label={`Account menu, ${label}`}
        className="account-trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <CircleUserRound size={18} />
        <span>{label}</span>
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          {handle && (
            <Link href={`/members/${handle}`} role="menuitem">
              <UserRound size={15} />
              My profile
            </Link>
          )}
          <Link href="/settings/profile" role="menuitem">
            <Settings size={15} />
            Settings
          </Link>
          {staff && (
            <Link href="/workspace" role="menuitem">
              <LayoutDashboard size={15} />
              Admin
            </Link>
          )}
          <Link href="/help" role="menuitem">
            <LifeBuoy size={15} />
            Help
          </Link>
          <form action="/api/auth/sign-out" method="POST">
            <button role="menuitem" type="submit">
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
