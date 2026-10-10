import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, Landmark, Search } from "lucide-react";
import { entityHref, getEntity } from "@/lib/catalog";
import {
  companyKey,
  filterFdaDevices,
  getFdaDeviceList,
  linkedRecordSlug,
} from "@/lib/fda-devices";
import { toggleParam } from "@/lib/url";
import { LibraryTabs } from "@/components/section-tabs";

export const metadata: Metadata = {
  title: "FDA-authorized AR/VR devices",
  description:
    "Every medical device the US FDA lists as using augmented or virtual reality, linked to the FDA record and refreshed daily.",
};

// Read per request: the discovery robot refreshes the list every day.
export const dynamic = "force-dynamic";

type ClearancesPageProps = {
  searchParams: Promise<{ panel?: string; year?: string; q?: string }>;
};


export default async function ClearancesPage({ searchParams }: ClearancesPageProps) {
  const params = await searchParams;
  const list = getFdaDeviceList();
  const results = filterFdaDevices(list.devices, params);

  const panels = new Map<string, number>();
  const years = new Map<string, number>();
  for (const device of list.devices) {
    panels.set(device.panel, (panels.get(device.panel) ?? 0) + 1);
    const year = device.decisionDate.slice(0, 4);
    years.set(year, (years.get(year) ?? 0) + 1);
  }
  const companyCount = new Set(list.devices.map((device) => companyKey(device.company))).size;
  const linkParams = { panel: params.panel, year: params.year, q: params.q };

  return (
    <div className="talks-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">
            <Landmark size={15} />
            Regulatory
          </span>
          <h1>Every AR/VR device the FDA has authorized.</h1>
          <p>
            {`${list.devices.length} devices from ${companyCount} companies`}, copied from the
            FDA&apos;s own list and checked for changes every day. Each row links to its
            FDA database record.
          </p>
        </div>
      </section>
      <LibraryTabs active="fda" />

      <div className="shell talks-body">
        <div className="external-note">
          <ExternalLink size={18} />
          <p>
            <strong>This is the regulator&apos;s list, shown as published.</strong> FDA
            authorization means a device may be marketed in the US for its stated use; it
            is not evidence of clinical effectiveness and not an AVRMD endorsement. Source:{" "}
            <a href={list.sourceUrl} rel="noreferrer" target="_blank">
              FDA, Augmented Reality and Virtual Reality Medical Devices
            </a>
            {list.sourceUpdated ? ` (FDA page updated ${list.sourceUpdated})` : ""}.
          </p>
        </div>

        <form action="/clearances" className="clearance-search" role="search">
          <Search size={16} />
          <input
            aria-label="Search devices, companies, or submission numbers"
            defaultValue={params.q ?? ""}
            name="q"
            placeholder="Search devices, companies, or K-numbers"
          />
          {params.panel && <input name="panel" type="hidden" value={params.panel} />}
          {params.year && <input name="year" type="hidden" value={params.year} />}
        </form>

        <div className="talk-filters">
          <div className="talk-filter-group">
            <span className="talk-filter-label">FDA panel</span>
            <Link className={`chip${!params.panel ? " chip-active" : ""}`} href={toggleParam("/clearances", linkParams, "panel")}>
              All
            </Link>
            {[...panels.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([panel, count]) => (
                <Link
                  className={`chip${params.panel === panel ? " chip-active" : ""}`}
                  href={toggleParam("/clearances", linkParams, "panel", panel)}
                  key={panel}
                >
                  {panel} ({count})
                </Link>
              ))}
          </div>
          <div className="talk-filter-group">
            <span className="talk-filter-label">Year</span>
            <Link className={`chip${!params.year ? " chip-active" : ""}`} href={toggleParam("/clearances", linkParams, "year")}>
              All
            </Link>
            {[...years.entries()]
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([year, count]) => (
                <Link
                  className={`chip${params.year === year ? " chip-active" : ""}`}
                  href={toggleParam("/clearances", linkParams, "year", year)}
                  key={year}
                >
                  {year} ({count})
                </Link>
              ))}
          </div>
        </div>

        <div className="result-line">
          <span>
            <strong>{results.length}</strong> {results.length === 1 ? "device" : "devices"}
          </span>
        </div>

        {results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>{list.devices.length === 0 ? "The FDA list has not been imported yet" : "No device matches that"}</h3>
            <p>{list.devices.length === 0 ? "It is refreshed by the daily discovery job." : "Try a broader filter."}</p>
          </div>
        ) : (
          <ol className="clearance-list">
            {results.map((device) => {
              const slug = linkedRecordSlug(device);
              const record = slug ? getEntity(slug) : undefined;
              return (
                <li className="clearance-row" key={device.submission}>
                  <span className="clearance-date">{device.decisionDate}</span>
                  <span className="clearance-main">
                    <a className="clearance-name" href={device.fdaUrl} rel="noreferrer" target="_blank">
                      {device.name}
                      <ArrowUpRight size={14} />
                    </a>
                    <small>{device.company}</small>
                    {record && (
                      <Link className="clearance-record" href={entityHref(record)}>
                        AVRMD record: {record.name}
                      </Link>
                    )}
                  </span>
                  <span className="clearance-meta">
                    <span className="chip">{device.panel}</span>
                    <code>{device.submission}</code>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
