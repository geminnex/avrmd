"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Reports the current page to /api/hit. Sends nothing when the visitor has opted out. */
export function PageView() {
  const pathname = usePathname();

  useEffect(() => {
    const optedOut =
      navigator.doNotTrack === "1" ||
      (globalThis as { GPC?: unknown }).GPC === true ||
      (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
    if (optedOut) return;

    const body = JSON.stringify({ path: pathname });
    if (typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon("/api/hit", new Blob([body], { type: "application/json" }))) return;
    }
    fetch("/api/hit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
