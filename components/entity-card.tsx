import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { CatalogEntity } from "@/lib/catalog-types";
import { TrustBadges } from "./trust-badges";

export function EntityCard({ entity }: { entity: CatalogEntity }) {
  return (
    <article className={`entity-card accent-${entity.accent}`}>
      <div className="entity-card-top">
        <span className="kind-label">{entity.typeLabel}</span>
        <span className="entity-mark" aria-hidden="true">
          {entity.name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </span>
      </div>
      <div>
        <Link className="entity-name" href={`/entities/${entity.slug}`}>
          {entity.name}
          <ArrowUpRight size={17} />
        </Link>
        <p className="entity-summary">{entity.summary}</p>
      </div>
      <div className="chip-row">
        {entity.modalities.slice(0, 3).map((modality) => (
          <span className="chip modality" key={modality}>
            {modality}
          </span>
        ))}
        {entity.specialties.slice(0, 2).map((specialty) => (
          <span className="chip" key={specialty}>
            {specialty}
          </span>
        ))}
      </div>
      <div className="entity-meta">
        <span>
          <MapPin size={13} />
          {entity.geography}
        </span>
        {entity.eventDate ? (
          <span>
            <CalendarDays size={13} />
            {new Date(`${entity.eventDate}T00:00:00`).toLocaleDateString("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ) : (
          <span>{entity.stage}</span>
        )}
      </div>
      <TrustBadges entity={entity} />
    </article>
  );
}

