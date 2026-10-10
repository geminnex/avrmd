import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  Clock3,
  FileCheck2,
  Megaphone,
  MessagesSquare,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { PreviewNote } from "@/components/preview-note";
import { timeAgo } from "@/lib/time";

export const metadata = {
  title: "Workspace preview",
  description: "The editorial queue of records discovered by the daily source check.",
};

/** The discovery job writes between builds, so read it per request. */
export const dynamic = "force-dynamic";

type Candidate = {
  id: string;
  status: string;
  discoveredAt: string;
  sourceId: string;
  entityKindHint?: string;
  title: string;
  sourceUrl: string;
  sourceLabel: string;
  published?: string | null;
};

type DiscoveryLog = {
  lastRunAt?: string;
  totalNew?: number;
  runs?: { source: string; fetched?: number; added?: number; error?: string }[];
};

async function readData<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), "data", file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

const lanes = [
  { icon: FileCheck2, label: "Catalog submissions", href: "/participate" },
  { icon: MessagesSquare, label: "Community reports", href: "/community" },
  { icon: Megaphone, label: "Promotion requests", href: "/for-organizations#promotion" },
  { icon: Bot, label: "AI policy", href: "/about#ai" },
];


export default async function WorkspacePage() {
  const candidates = await readData<Candidate[]>("candidates.json", []);
  const log = await readData<DiscoveryLog>("discovery-log.json", {});

  const pending = candidates.filter((item) => item.status === "pending");
  const approved = candidates.filter((item) => item.status === "approved");
  const bySource = new Map<string, number>();
  for (const item of pending) {
    bySource.set(item.sourceId, (bySource.get(item.sourceId) ?? 0) + 1);
  }

  return (
    <div className="workspace-page">
      <section className="workspace-top">
        <div className="shell workspace-title">
          <div>
            <span className="eyebrow">
              <Radar size={15} />
              Editorial workspace
            </span>
            <h1>Discovery queue</h1>
            <p>
              A daily check reads allowlisted research, regulatory, and registry sources
              and lists what is not yet in the catalog. Nothing is published without a
              person approving it.
            </p>
          </div>
        </div>
      </section>

      <div className="shell workspace-grid">
        <div className="workspace-main">
          <PreviewNote title="Real data, preview interface">
            The queue below is genuine output from the daily job. Approving from the
            browser needs accounts, which are not connected — today approval runs from the
            command line.
          </PreviewNote>

          <div className="metric-grid">
            <div>
              <ShieldCheck size={19} />
              <strong>{pending.length}</strong>
              <span>Awaiting review</span>
            </div>
            <div>
              <FileCheck2 size={19} />
              <strong>{approved.length}</strong>
              <span>Approved to date</span>
            </div>
            <div>
              <Radar size={19} />
              <strong>{bySource.size}</strong>
              <span>Sources reporting</span>
            </div>
            <div>
              <Clock3 size={19} />
              <strong>{log.lastRunAt ? timeAgo(log.lastRunAt) : "—"}</strong>
              <span>Last check</span>
            </div>
          </div>

          <div className="queue-panel">
            <div className="queue-head">
              <h2>Pending candidates</h2>
              <span>{pending.length} in queue</span>
            </div>

            {pending.length === 0 ? (
              <p className="queue-empty">
                Nothing waiting. The next check runs within a day.
              </p>
            ) : (
              pending.slice(0, 12).map((item) => (
                <a
                  className="candidate-row"
                  href={item.sourceUrl}
                  key={item.id}
                  rel="noopener"
                  target="_blank"
                >
                  <span className="candidate-kind">{item.entityKindHint ?? "record"}</span>
                  <span className="candidate-body">
                    <strong>{item.title}</strong>
                    <small>
                      {item.sourceLabel}
                      {item.published ? ` · ${item.published}` : ""}
                    </small>
                  </span>
                  <span className="candidate-age">{timeAgo(item.discoveredAt)}</span>
                  <ArrowUpRight size={16} />
                </a>
              ))
            )}

            {pending.length > 12 && (
              <p className="queue-more">and {pending.length - 12} more in the queue</p>
            )}
          </div>
        </div>

        <aside className="workspace-aside">
          <div className="sidebar-card">
            <span className="eyebrow">Sources checked</span>
            {log.runs?.length ? (
              <ul className="source-run-list">
                {log.runs.map((run) => (
                  <li key={run.source}>
                    <span>{run.source}</span>
                    <strong>{run.error ? "error" : `${run.added ?? 0} new`}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No run recorded yet.</p>
            )}
            <Link className="primary-link" href="/about#sources">
              Source policy
            </Link>
          </div>

          <div className="sidebar-card">
            <span className="eyebrow">Other queues</span>
            <ul className="lane-list">
              {lanes.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <Link href={href}>
                    <Icon size={16} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-card professional-note">
            <strong>Nothing publishes automatically</strong>
            <p>
              Discovery only proposes. Every catalog change is reviewed by a person before
              it appears on the site.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
