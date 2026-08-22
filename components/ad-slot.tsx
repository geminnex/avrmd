import Link from "next/link";
import { ArrowUpRight, Megaphone } from "lucide-react";
import { getActiveAds, type AdContext, type AdSlot as AdSlotName } from "@/lib/ads";

/**
 * Fixed-position promotional slot. It never sits inside organic results and
 * never changes their order — an empty slot shows a house placeholder rather
 * than collapsing, so the boundary between paid and organic stays visible.
 */
export function AdSlot({
  slot,
  context = {},
  house = true,
}: {
  slot: AdSlotName;
  context?: AdContext;
  house?: boolean;
}) {
  const ads = getActiveAds(slot, context);

  if (ads.length === 0) {
    if (!house) return null;
    return (
      <aside className="ad-slot ad-house">
        <span className="ad-label house">AVRMD</span>
        <strong>Promote your organisation here</strong>
        <p>
          Labelled placements for events, launches, and briefings. Promotion never affects
          record ranking or review state.
        </p>
        <Link href="/for-organizations#promotion">
          See placements
          <ArrowUpRight size={15} />
        </Link>
      </aside>
    );
  }

  return (
    <>
      {ads.map((campaign) => (
        <aside className="ad-slot" key={campaign.id}>
          <span className="ad-label">
            <Megaphone size={12} />
            Sponsored
          </span>
          <strong>{campaign.creative.headline}</strong>
          <p>{campaign.creative.body}</p>
          <a href={campaign.creative.href} rel="sponsored noopener" target="_blank">
            {campaign.advertiser}
            <ArrowUpRight size={15} />
          </a>
        </aside>
      ))}
    </>
  );
}
