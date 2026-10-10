import type { Metadata } from "next";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import {
  getResourcesByCategory,
  resourceCategoryLabels,
  resourceScopeLabels,
  type ResourceScope,
} from "@/lib/resources";
import { LibraryTabs } from "@/components/section-tabs";

export const metadata: Metadata = {
  title: "Related websites",
  description:
    "Journals, conferences, standards bodies, and industry news covering medical XR and the wider AR/VR/XR field.",
};

type ResourcesPageProps = {
  searchParams: Promise<{ scope?: string }>;
};

const scopes: (ResourceScope | "all")[] = ["all", "medical", "general-xr"];

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const params = await searchParams;
  const scope: ResourceScope | "all" =
    params.scope === "medical" || params.scope === "general-xr" ? params.scope : "all";
  const groups = getResourcesByCategory(scope);

  return (
    <div className="resources-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">Related websites</span>
          <h1>Where the rest of the field publishes.</h1>
          <p>
            Journals, conferences, standards bodies, and industry press covering medical
            XR and the wider AR, VR, and MR industry.
          </p>
        </div>
      </section>
      <LibraryTabs active="websites" />

      <div className="shell resources-body">
        <div className="external-note">
          <ExternalLink size={18} />
          <p>
            <strong>These are external links, not AVRMD records.</strong> AVRMD does not
            review, verify, or endorse the content of these sites. Catalog records carry
            a source and a review state; the links on this page do not.
          </p>
        </div>

        <div className="scope-filter" role="group" aria-label="Filter related websites">
          {scopes.map((item) => (
            <a
              className={`chip${scope === item ? " chip-active" : ""}`}
              href={item === "all" ? "/resources" : `/resources?scope=${item}`}
              key={item}
            >
              {item === "all" ? "Everything" : resourceScopeLabels[item]}
            </a>
          ))}
        </div>

        {groups.map((group) => (
          <section className="resource-section" key={group.category}>
            <h2>{resourceCategoryLabels[group.category]}</h2>
            <div className="resource-grid">
              {group.items.map((resource) => (
                <a
                  className="resource-card"
                  href={resource.url}
                  key={resource.slug}
                  rel="noopener"
                  target="_blank"
                >
                  <span className="resource-card-head">
                    <strong>{resource.name}</strong>
                    <ArrowUpRight size={16} />
                  </span>
                  <small>{resource.description}</small>
                  <span className="resource-scope">{resourceScopeLabels[resource.scope]}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
