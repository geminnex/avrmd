import type { Metadata } from "next";
import { CatalogExplorer } from "@/components/catalog-explorer";
import type { CatalogFilterKind } from "@/lib/catalog";
import { entityKinds } from "@/lib/catalog-types";

export const metadata: Metadata = {
  title: "Explore",
  description: "Search source-aware medical XR organizations, solutions, evidence, and events.",
};

type ExplorePageProps = {
  searchParams: Promise<{
    kind?: string;
    q?: string;
    modality?: string;
    specialty?: string;
    stage?: string;
  }>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const validKinds: string[] = [...entityKinds, "gear"];
  const initialKind: CatalogFilterKind =
    params.kind && validKinds.includes(params.kind)
      ? (params.kind as CatalogFilterKind)
      : "all";

  return (
    <div className="explore-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">Discover medical XR</span>
          <h1>Evidence and ecosystem, in one view.</h1>
          <p>
            Browse reviewed public metadata. Trust labels describe provenance—not clinical
            endorsement.
          </p>
        </div>
      </section>
      <div className="shell">
        <CatalogExplorer
          heading="Catalog"
          initialKind={initialKind}
          initialModality={params.modality ?? "all"}
          initialQuery={params.q ?? ""}
          initialSpecialty={params.specialty ?? "all"}
          initialStage={params.stage ?? "all"}
          syncUrl
        />
      </div>
    </div>
  );
}
