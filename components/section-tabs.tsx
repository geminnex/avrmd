import Link from "next/link";

type Tab = { key: string; label: string; href: string };

const library: Tab[] = [
  { key: "records", label: "Records", href: "/explore" },
  { key: "topics", label: "Clinical topics", href: "/topics" },
  { key: "fda", label: "FDA devices", href: "/clearances" },
  { key: "signals", label: "Papers & news", href: "/signals" },
  { key: "gear", label: "Gear", href: "/gear" },
  { key: "websites", label: "Websites", href: "/resources" },
];

const people: Tab[] = [
  { key: "questions", label: "Questions", href: "/questions" },
  { key: "members", label: "Members", href: "/members" },
  { key: "updates", label: "Updates", href: "/network" },
];

/**
 * One tab bar per area, so related pages read as one place: Library (what
 * is known) and People (who to ask). Replaces separate header entries.
 */
function Tabs({ tabs, active, label }: { tabs: Tab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="section-tabs">
      <div className="shell section-tabs-inner">
        {tabs.map((tab) => (
          <Link
            aria-current={tab.key === active ? "page" : undefined}
            className={tab.key === active ? "active" : undefined}
            href={tab.href}
            key={tab.key}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function LibraryTabs({ active }: { active: string }) {
  return <Tabs active={active} label="Library" tabs={library} />;
}

export function PeopleTabs({ active }: { active: string }) {
  return <Tabs active={active} label="People" tabs={people} />;
}
