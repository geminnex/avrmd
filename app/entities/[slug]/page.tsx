import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  CalendarClock,
  CalendarDays,
  CircleAlert,
  CircleDot,
  MapPin,
  MessageCircleQuestion,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { EntityCard } from "@/components/entity-card";
import { EntityGroupPanel } from "@/components/entity-group-panel";
import { FollowButton } from "@/components/follow-button";
import { TrustBadges } from "@/components/trust-badges";
import { WorkflowForm } from "@/components/workflow-form";
import {
  catalog,
  getEntity,
  getOwnerEntity,
  getRelatedEntitiesByKind,
  kindLabels,
} from "@/lib/catalog";
import { getTopicsForEntity } from "@/lib/topics";
import { getStagesForEntity } from "@/lib/stages";

type EntityPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  // Problems live at /problems/[slug]; everything else stays here.
  return catalog
    .filter((entity) => entity.kind !== "problem")
    .map((entity) => ({ slug: entity.slug }));
}

export async function generateMetadata({ params }: EntityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entity = getEntity(slug);
  if (!entity) return {};

  return {
    title: entity.name,
    description: entity.summary,
  };
}

export default async function EntityPage({ params }: EntityPageProps) {
  const { slug } = await params;
  const entity = getEntity(slug);
  // Problems have their own page and layout at /problems/[slug].
  if (!entity || entity.kind === "problem") notFound();
  const relatedGroups = getRelatedEntitiesByKind(entity);
  const ownerEntity = getOwnerEntity(entity);
  const entityTopics = getTopicsForEntity(entity);
  const entityStages = getStagesForEntity(entity);

  return (
    <div className="entity-page">
      <section className={`entity-hero accent-${entity.accent}`}>
        <div className="entity-hero-grid" aria-hidden="true" />
        <div className="shell">
          <Link className="back-link" href={`/explore?kind=${entity.kind}`}>
            <ArrowLeft size={16} />
            Back to {kindLabels[entity.kind].toLowerCase()}
          </Link>
          <div className="entity-hero-layout">
            <div>
              <span className="kind-label inverted">{entity.typeLabel}</span>
              <h1>{entity.name}</h1>
              <p>{entity.summary}</p>
              <TrustBadges entity={entity} />
              {entityTopics.length > 0 && (
                <div className="entity-topic-row">
                  <span>Appears in</span>
                  {entityTopics.map((topic) => (
                    <Link href={`/topics/${topic.slug}`} key={topic.slug}>
                      {topic.shortName}
                    </Link>
                  ))}
                </div>
              )}
              {entityStages.length > 0 && (
                <div className="entity-stage-row">
                  <span>Stage</span>
                  {entityStages.map((stage) => (
                    <Link href={`/stages/${stage.slug}`} key={stage.slug}>
                      {stage.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <aside className="entity-action-card">
              <span className="entity-mark large" aria-hidden="true">
                {entity.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              {entity.claimStatus === "unclaimed" ? (
                <>
                  <strong>Represent this record?</strong>
                  <p>Claims are free and reviewed using a work-domain email.</p>
                  <Link className="entity-action-link" href="/participate">
                    Claim this page
                  </Link>
                </>
              ) : (
                <>
                  <strong>Permanent reference record</strong>
                  <p>Suggest a metadata correction with supporting sources.</p>
                  <Link className="entity-action-link" href="/participate">
                    Suggest a correction
                  </Link>
                </>
              )}
            </aside>
          </div>
        </div>
      </section>

      <div className="shell entity-content-grid">
        <article className="entity-main">
          <nav className="entity-tabs" aria-label="Record sections">
            <a href="#overview">Overview</a>
            <a href="#sources">Sources</a>
            <a href="#community">Q&A</a>
            <a href="#group">Group</a>
            {relatedGroups.length > 0 && <a href="#related">Connected records</a>}
          </nav>

          <section className="detail-section" id="overview">
            <span className="eyebrow">Structured overview</span>
            <h2>What this record covers</h2>
            <div className="fact-grid">
              {entity.owner && (
                <div>
                  <Building2 size={18} />
                  <span>
                    <small>{entity.kind === "solution" ? "Developer" : "Owner"}</small>
                    {ownerEntity ? (
                      <strong>
                        <Link href={`/entities/${ownerEntity.slug}`}>{entity.owner}</Link>
                      </strong>
                    ) : (
                      <strong>{entity.owner}</strong>
                    )}
                  </span>
                </div>
              )}
              {entity.eventDate && (
                <div>
                  <CalendarDays size={18} />
                  <span>
                    <small>Event date</small>
                    <strong>
                      {new Date(`${entity.eventDate}T00:00:00`).toLocaleDateString("en", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </strong>
                  </span>
                </div>
              )}
              <div>
                <MapPin size={18} />
                <span>
                  <small>Geography</small>
                  <strong>{entity.geography}</strong>
                </span>
              </div>
              <div>
                <Network size={18} />
                <span>
                  <small>Modalities</small>
                  <strong>{entity.modalities.join(", ")}</strong>
                </span>
              </div>
              <div>
                <BookOpenCheck size={18} />
                <span>
                  <small>Maturity</small>
                  <strong>{entity.stage}</strong>
                </span>
              </div>
              <div>
                <CalendarClock size={18} />
                <span>
                  <small>Last reviewed</small>
                  <strong>{entity.lastReviewed}</strong>
                </span>
              </div>
            </div>
          </section>

          <section className="detail-section">
            <h2>Clinical areas and use cases</h2>
            <div className="tag-groups">
              <div>
                <h3>Specialties</h3>
                <div className="chip-row">
                  {entity.specialties.map((item) => (
                    <span className="chip" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3>Use cases</h3>
                <div className="chip-row">
                  {entity.useCases.map((item) => (
                    <span className="chip modality" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {entity.regulatoryNote && (
            <section className="regulatory-note">
              <CircleAlert size={20} />
              <div>
                <strong>Regulatory context</strong>
                <p>{entity.regulatoryNote}</p>
                <small>
                  This is source-linked metadata, not an AVRMD endorsement or medical
                  recommendation.
                </small>
              </div>
            </section>
          )}

          <section className="detail-section source-section" id="sources">
            <span className="eyebrow">Provenance</span>
            <h2>Primary source</h2>
            <a href={entity.sourceUrl} rel="noreferrer" target="_blank">
              <span>
                <ShieldCheck size={19} />
                <span>
                  <strong>{entity.sourceLabel}</strong>
                  <small>{entity.sourceNote}</small>
                </span>
              </span>
              <ArrowUpRight size={18} />
            </a>
          </section>

          <section className="community-preview" id="community">
            <div>
              <MessageCircleQuestion size={24} />
              <span>
                <strong>Questions about this record</strong>
                {entityTopics.length > 0 ? (
                  <p>
                    Discussion is grouped by clinical topic. See what professionals are
                    asking in{" "}
                    <Link href={`/topics/${entityTopics[0].slug}#discussions`}>
                      {entityTopics[0].shortName}
                    </Link>
                    .
                  </p>
                ) : (
                  <p>
                    Discussion is grouped by clinical topic across the{" "}
                    <Link href="/community">community</Link>.
                  </p>
                )}
              </span>
            </div>
            <FollowButton
              followingId={entity.slug}
              followingType="entity"
              label="Follow this record"
            />
          </section>

          <section className="detail-section" id="group">
            <span className="eyebrow">Forum, blog, and media</span>
            <h2>This record's group</h2>
            <EntityGroupPanel slug={entity.slug} />
          </section>

          {entity.claimStatus === "claimed" && (
            <section className="entity-inquiry-section">
              <WorkflowForm compact entitySlug={entity.slug} mode="inquiry" />
            </section>
          )}
        </article>

        <aside className="entity-sidebar">
          <div className="sidebar-card">
            <span className="eyebrow">Record status</span>
            {entity.reviewStatus === "source-reviewed" ? (
              <div className="status-line">
                <ShieldCheck size={17} />
                <span>
                  <strong>Source reviewed</strong>
                  Cited source checked by staff
                </span>
              </div>
            ) : entity.reviewStatus === "metadata-reviewed" ? (
              <div className="status-line">
                <CircleDot size={17} />
                <span>
                  <strong>Metadata reviewed</strong>
                  High-level description only
                </span>
              </div>
            ) : (
              <div className="status-line">
                <CircleAlert size={17} />
                <span>
                  <strong>Needs review</strong>
                  Awaiting editorial verification
                </span>
              </div>
            )}
            <div className="status-line">
              <Sparkles size={17} />
              <span>
                <strong>{entity.aiAssisted ? "AI-assisted" : "Human reviewed"}</strong>
                {entity.aiAssisted
                  ? "AI proposed fields; a human approved them"
                  : "No autonomous publication"}
              </span>
            </div>
          </div>
          <div className="sidebar-card professional-note">
            <strong>Professional information only</strong>
            <p>AVRMD does not provide diagnosis, treatment, or clinical advice.</p>
          </div>
        </aside>
      </div>

      {relatedGroups.length > 0 && (
        <section className="related-section" id="related">
          <div className="shell">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Connected records</span>
                <h2>Follow the evidence and ecosystem</h2>
              </div>
            </div>
            {relatedGroups.map((group) => (
              <div className="related-group" key={group.kind}>
                <h3 className="related-group-heading">{kindLabels[group.kind]}</h3>
                <div className="entity-grid">
                  {group.items.map((item) => (
                    <EntityCard entity={item} key={item.id} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
