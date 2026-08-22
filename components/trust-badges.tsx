import { BadgeCheck, Bot, CircleDot, ShieldCheck } from "lucide-react";
import type { CatalogEntity } from "@/lib/catalog-types";

export function TrustBadges({ entity }: { entity: CatalogEntity }) {
  return (
    <div className="trust-row" aria-label="Record trust signals">
      {entity.reviewStatus === "source-reviewed" ? (
        <span className="trust-badge reviewed">
          <ShieldCheck size={13} />
          Source reviewed
        </span>
      ) : (
        <span className="trust-badge metadata">
          <CircleDot size={13} />
          Metadata reviewed
        </span>
      )}
      {entity.claimStatus === "claimed" && (
        <span className="trust-badge claimed">
          <BadgeCheck size={13} />
          Claimed
        </span>
      )}
      {entity.aiAssisted && (
        <span className="trust-badge ai">
          <Bot size={13} />
          AI-assisted
        </span>
      )}
    </div>
  );
}

