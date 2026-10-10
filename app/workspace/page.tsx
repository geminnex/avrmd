import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bot, Clock3, FileCheck2, Inbox, Radar, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { modalities, specialties, useCases } from "@/lib/catalog";
import { entityKinds } from "@/lib/catalog-types";
import { readDataFile } from "@/lib/data-file";
import { initialFields } from "@/lib/review";
import { readQueue } from "@/lib/review-store";
import { stages } from "@/lib/stages";
import { timeAgo } from "@/lib/time";
import { ContributionActions, RestoreButton, ReviewCard } from "@/components/review-card";

export const metadata: Metadata = { title: "Editorial workspace", robots: { index: false } };
export const dynamic = "force-dynamic";

type Contribution = Awaited<ReturnType<typeof import("@/lib/db/repositories/contributions").listContributions>>[number];

async function loadContributions(): Promise<Contribution[]> {
  try {
    const { listContributions } = await import("@/lib/db/repositories/contributions");
    return await listContributions();
  } catch {
    return [];
  }
}

function describeContribution(payload: Record<string, unknown>) {
  const name = payload.name ?? payload.entityName ?? payload.organizationName ?? payload.entitySlug ?? "";
  const detail = payload.sourceUrl ?? payload.relationship ?? payload.campaignGoal ?? payload.message ?? "";
  return { name: String(name), detail: String(detail) };
}

/** Editors only: the AI-triaged discovery queue and what people sent in. */
export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!isStaff(user)) notFound();

  const queue = readQueue();
  const log = readDataFile<{ lastRunAt?: string }>("discovery-log.json", {});
  const recommended = queue
    .filter((item) => item.status === "pending")
    .sort((a, b) => (b.triage?.confidence ?? -1) - (a.triage?.confidence ?? -1));
  const dismissed = queue
    .filter((item) => item.status === "dismissed")
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
  const approved = queue.filter((item) => item.status === "approved");
  const contributions = await loadContributions();
  const openContributions = contributions.filter((row) => row.contribution.status === "submitted");

  const vocab = {
    kinds: [...entityKinds],
    specialties: specialties.map((value) => ({ value, label: value })),
    useCases: useCases.map((value) => ({ value, label: value })),
    modalities: modalities.map((value) => ({ value, label: value })),
    stages: stages.map((stage) => ({ value: stage.slug, label: stage.name })),
  };

  return (
    <div className="workspace-page">
      <section className="workspace-top">
        <div className="shell workspace-title">
          <div>
            <span className="eyebrow">
              <Radar size={15} />
              Editorial workspace
            </span>
            <h1>Review queue</h1>
            <p>
              The daily robot finds papers, trials, filings and news; AI sets aside the
              routine and off-topic ones and drafts a record for the rest. You decide what
              enters the catalog. Approved records publish with the next deploy.
            </p>
          </div>
        </div>
      </section>

      <div className="shell review-body">
        <div className="metric-grid">
          <div>
            <ShieldCheck size={19} />
            <strong>{recommended.length}</strong>
            <span>To review</span>
          </div>
          <div>
            <Inbox size={19} />
            <strong>{openContributions.length}</strong>
            <span>Contributions open</span>
          </div>
          <div>
            <FileCheck2 size={19} />
            <strong>{approved.length}</strong>
            <span>Approved</span>
          </div>
          <div>
            <Clock3 size={19} />
            <strong>{log.lastRunAt ? timeAgo(log.lastRunAt) : "—"}</strong>
            <span>Last robot run</span>
          </div>
        </div>

        <section className="review-section">
          <h2>Contributions</h2>
          {contributions.length === 0 ? (
            <p className="queue-empty">Nothing sent in yet.</p>
          ) : (
            <ul className="contribution-list">
              {contributions.map(({ contribution, email }) => {
                const { name, detail } = describeContribution(contribution.payload);
                return (
                  <li className={contribution.status === "submitted" ? "open" : ""} key={contribution.id}>
                    <span>
                      <small>
                        {contribution.kind} · {email} · {timeAgo(contribution.createdAt)} · {contribution.status}
                      </small>
                      <strong>{name}</strong>
                      {detail && <em>{detail.slice(0, 200)}</em>}
                    </span>
                    <ContributionActions id={contribution.id} status={contribution.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="review-section">
          <h2>
            Recommended for the catalog <span>{recommended.length}</span>
          </h2>
          {recommended.length === 0 ? (
            <p className="queue-empty">Nothing waiting. The robot runs daily.</p>
          ) : (
            recommended.slice(0, 25).map((item) => (
              <ReviewCard
                confidence={item.triage?.confidence}
                id={item.id}
                initial={initialFields(item)}
                key={item.id}
                published={item.published}
                reason={item.triage?.reason}
                sourceLabel={item.sourceLabel}
                sourceUrl={item.sourceUrl}
                title={item.title}
                vocab={vocab}
              />
            ))
          )}
          {recommended.length > 25 && <p className="queue-empty">Showing the 25 highest-confidence; decide these to see more.</p>}
        </section>

        <section className="review-section">
          <h2>
            <Bot size={18} /> Set aside by AI <span>{dismissed.length}</span>
          </h2>
          <p className="queue-empty">
            Routine or off-topic items stay in the papers &amp; news feed (or out of it, if off
            topic). Restore any that deserve a record.
          </p>
          <ul className="dismissed-list">
            {dismissed.slice(0, 40).map((item) => (
              <li key={item.id}>
                <span>
                  <a href={item.sourceUrl} rel="noopener" target="_blank">
                    {item.title}
                  </a>
                  <small>
                    {item.triage?.recommendation === "off_topic" ? "Off topic" : "Signal only"} ·{" "}
                    {item.triage?.reason}
                  </small>
                </span>
                <RestoreButton id={item.id} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
