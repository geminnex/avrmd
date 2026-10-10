"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

/** Fired by /notifications once it has marked everything read. */
export const notificationsReadEvent = "avrmd:notifications-read";

export function NotificationBell({ unread }: { unread: number }) {
  const [count, setCount] = useState(unread);

  useEffect(() => setCount(unread), [unread]);

  useEffect(() => {
    const clear = () => setCount(0);
    window.addEventListener(notificationsReadEvent, clear);
    return () => window.removeEventListener(notificationsReadEvent, clear);
  }, []);

  const label =
    count > 0 ? `Notifications, ${count} unread` : "Notifications, none unread";

  return (
    <Link aria-label={label} className="notification-bell" href="/notifications" title={label}>
      <Bell size={17} />
      {count > 0 && <span className="notification-badge">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
