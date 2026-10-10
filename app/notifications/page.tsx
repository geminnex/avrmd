import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCircle2, LifeBuoy, MessageSquareReply } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { listNotifications } from "@/lib/db/repositories/notifications";
import { timeAgo } from "@/lib/time";
import { MarkNotificationsRead } from "@/components/mark-notifications-read";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

type NotificationItem = Awaited<ReturnType<typeof listNotifications>>[number];

function describe(item: NotificationItem) {
  const who = item.actor?.displayName || (item.actor ? `@${item.actor.handle}` : "Someone");
  switch (item.kind) {
    case "question_routed":
      return {
        icon: <LifeBuoy size={17} />,
        lead: `${who} asked something you said you can help with`,
        // Always say which declaration caused it — the recipient can change it.
        why: item.matched.length > 0 ? `Matched on ${item.matched.join(", ")}` : null,
      };
    case "answer_posted":
      return { icon: <MessageSquareReply size={17} />, lead: `${who} answered your question`, why: null };
    case "answer_accepted":
      return {
        icon: <CheckCircle2 size={17} />,
        lead: `${who} said your answer helped`,
        why: null,
      };
  }
}

export default async function NotificationsPage() {
  const user = await requireUserOrRedirect("/sign-in?next=/notifications");

  let items: NotificationItem[] = [];
  let databaseDown = false;
  try {
    items = await listNotifications(user.id);
  } catch {
    databaseDown = true;
  }
  const unread = items.filter((item) => !item.read).length;

  return (
    <div className="workflow-page">
      <section className="workflow-hero">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell workflow-hero-layout">
          <div>
            <span className="eyebrow light">
              <Bell size={15} />
              Notifications
            </span>
            <h1>{unread > 0 ? `${unread} new` : "You are up to date."}</h1>
            <p>
              Questions you can help with, and replies to yours. You are only asked about
              what your <Link href="/settings/profile">profile</Link> says you can help with.
            </p>
          </div>
        </div>
      </section>

      <section className="shell settings-body wide-body">
        <MarkNotificationsRead unread={unread} />
        {databaseDown ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>Notifications are unavailable right now</h3>
            <p>Everything else on the site still works. Try again shortly.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>Nothing yet</h3>
            <p>
              When someone asks about a thing you can help with, it shows up here. Say what
              that is on your profile.
            </p>
            <Link className="button-primary" href="/questions">
              Browse questions
            </Link>
          </div>
        ) : (
          <ol className="notification-list">
            {items.map((item) => {
              const text = describe(item);
              const href = item.answerId
                ? `/questions/${item.questionId}#answer-${item.answerId}`
                : `/questions/${item.questionId}`;
              return (
                <li className={`notification-row${item.read ? "" : " unread"}`} key={item.id}>
                  <Link href={href}>
                    <span className="notification-icon">{text.icon}</span>
                    <span className="notification-text">
                      <span>{text.lead}</span>
                      <strong>{item.questionTitle}</strong>
                      <small>
                        {text.why ? `${text.why} · ` : ""}
                        {timeAgo(item.createdAt)}
                      </small>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
