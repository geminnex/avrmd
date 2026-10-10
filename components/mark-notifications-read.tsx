"use client";

import { useEffect } from "react";
import { notificationsReadEvent } from "./notification-bell";

/**
 * Opening /notifications is reading them. Done from the client after the
 * list has rendered, so the page can still highlight what was new.
 */
export function MarkNotificationsRead({ unread }: { unread: number }) {
  useEffect(() => {
    if (unread === 0) return;
    fetch("/api/notifications/read", { method: "POST" })
      .then((response) => {
        if (response.ok) window.dispatchEvent(new Event(notificationsReadEvent));
      })
      .catch(() => undefined);
  }, [unread]);

  return null;
}
