import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";
import { EntityCard } from "@/components/entity-card";
import { getGear } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Gear and hardware",
  description:
    "General-purpose XR headsets and hardware that medical XR software is deployed on.",
};

export default function GearPage() {
  const gear = getGear();

  return (
    <div className="gear-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">The hardware layer</span>
          <h1>Gear medical XR runs on.</h1>
          <p>
            Clinical software has to be delivered on a device. AVRMD tracks the
            general-purpose headsets that medical XR is deployed on, so device questions
            can be separated from clinical ones.
          </p>
        </div>
      </section>

      <div className="shell gear-body">
        <div className="regulatory-note">
          <CircleAlert size={20} />
          <div>
            <strong>These are not medical devices</strong>
            <p>
              Every headset listed here is general-purpose consumer or enterprise
              hardware. Regulatory clearance attaches to the medical software or system
              deployed on a headset, never to the headset itself.
            </p>
          </div>
        </div>

        <div className="entity-grid">
          {gear.map((entity) => (
            <EntityCard entity={entity} key={entity.id} />
          ))}
        </div>

        <div className="secondary-browse">
          <div>
            <strong>Looking for what runs on this hardware?</strong>
            <span>
              Clinical topics group the software, organisations, and evidence by the
              problem they address.
            </span>
          </div>
          <Link className="primary-link" href="/topics">
            Browse clinical topics
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}
