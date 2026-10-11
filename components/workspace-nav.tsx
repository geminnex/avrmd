import Link from "next/link";
import type { WorkspaceCounts } from "@/lib/workspace-counts";

export type WorkspaceTab = "overview" | "agents" | "queue" | "reports" | "contributions" | "invite" | "members";

/** Tabs across the admin tools, each with what is waiting in it. */
export function WorkspaceNav({
  current,
  counts,
  showMembers,
}: {
  current: WorkspaceTab;
  counts: WorkspaceCounts;
  showMembers: boolean;
}) {
  const tabs: { id: WorkspaceTab; label: string; href: string; count?: number }[] = [
    { id: "overview", label: "Overview", href: "/workspace" },
    { id: "agents", label: "AI team", href: "/workspace/agents", count: counts.agents },
    { id: "queue", label: "Review queue", href: "/workspace?tab=queue", count: counts.queue },
    { id: "reports", label: "Reports", href: "/workspace?tab=reports", count: counts.reports },
    { id: "contributions", label: "Contributions", href: "/workspace?tab=contributions", count: counts.contributions },
    { id: "invite", label: "Invitations", href: "/workspace?tab=invite", count: counts.invitations },
    ...(showMembers ? [{ id: "members" as const, label: "Members", href: "/workspace/members" }] : []),
  ];
  return (
    <nav aria-label="Admin" className="workspace-nav">
      {tabs.map((tab) => (
        <Link aria-current={current === tab.id ? "page" : undefined} href={tab.href} key={tab.id}>
          {tab.label}
          {tab.count ? <span className={tab.id === "reports" ? "workspace-count alert" : "workspace-count"}>{tab.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
