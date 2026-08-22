"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search, SlidersHorizontal, Stethoscope, X } from "lucide-react";
import {
  filterKindLabels,
  modalities,
  searchCatalog,
  specialties,
  type CatalogFilterKind,
} from "@/lib/catalog";
import { entityKinds } from "@/lib/catalog-types";
import { AdSlot } from "./ad-slot";
import { EntityCard } from "./entity-card";

const filterKinds: CatalogFilterKind[] = [...entityKinds, "gear"];

type CatalogExplorerProps = {
  initialKind?: CatalogFilterKind;
  initialQuery?: string;
  initialModality?: string;
  initialSpecialty?: string;
  limit?: number;
  heading?: string;
  syncUrl?: boolean;
};

export function CatalogExplorer({
  initialKind = "all",
  initialQuery = "",
  initialModality = "all",
  initialSpecialty = "all",
  limit,
  heading = "Explore the network",
  syncUrl = false,
}: CatalogExplorerProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<CatalogFilterKind>(initialKind);
  const [modality, setModality] = useState(initialModality);
  const [specialty, setSpecialty] = useState(initialSpecialty);

  // Header links like /explore?kind=event change searchParams without
  // remounting this client component, so mirror those props into state.
  useEffect(() => {
    setKind(initialKind);
  }, [initialKind]);
  useEffect(() => {
    setModality(initialModality);
  }, [initialModality]);

  // Keep the URL shareable/bookmarkable; debounced so typing stays smooth.
  useEffect(() => {
    if (!syncUrl) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (kind !== "all") params.set("kind", kind);
      if (modality !== "all") params.set("modality", modality);
      if (specialty !== "all") params.set("specialty", specialty);
      const search = params.toString();
      router.replace(search ? `/explore?${search}` : "/explore", { scroll: false });
    }, 250);
    return () => clearTimeout(handle);
  }, [kind, modality, query, router, specialty, syncUrl]);

  const results = useMemo(() => {
    const filtered = searchCatalog(query, kind, modality, specialty);
    return limit ? filtered.slice(0, limit) : filtered;
  }, [kind, limit, modality, query, specialty]);

  return (
    <section className="catalog-section">
      <div className="section-heading catalog-heading">
        <div>
          <span className="eyebrow">Reviewed metadata</span>
          <h2>{heading}</h2>
        </div>
        <p>
          Search by clinical need, modality, organization, or use case. Every result shows
          its source and review state.
        </p>
      </div>

      <div className="search-panel">
        <label className="main-search">
          <Search size={20} />
          <span className="sr-only">Search the AVRMD catalog</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “surgical training”, “pain”, or “MR visualization”"
            value={query}
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")} type="button">
              <X size={17} />
            </button>
          )}
        </label>
        <label className="select-control">
          <SlidersHorizontal size={16} />
          <span className="sr-only">Record type</span>
          <select
            onChange={(event) => setKind(event.target.value as CatalogFilterKind)}
            value={kind}
          >
            <option value="all">All record types</option>
            {filterKinds.map((item) => (
              <option key={item} value={item}>
                {filterKindLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <Filter size={16} />
          <span className="sr-only">XR modality</span>
          <select onChange={(event) => setModality(event.target.value)} value={modality}>
            <option value="all">All modalities</option>
            {modalities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <Stethoscope size={16} />
          <span className="sr-only">Clinical specialty</span>
          <select onChange={(event) => setSpecialty(event.target.value)} value={specialty}>
            <option value="all">All specialties</option>
            {specialties.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="result-line">
        <span>
          <strong>{results.length}</strong> reviewed records
        </span>
        <span className="result-note">Organic results — sponsorship never changes ranking</span>
      </div>

      <AdSlot slot="directory-inline" />

      {results.length ? (
        <div className="entity-grid">
          {results.map((entity) => (
            <EntityCard entity={entity} key={entity.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-orbit" />
          <h3>No exact match yet</h3>
          <p>Try a broader clinical term or remove one of the filters.</p>
          <button
            onClick={() => {
              setQuery("");
              setKind("all");
              setModality("all");
              setSpecialty("all");
            }}
            type="button"
          >
            Reset discovery
          </button>
        </div>
      )}
    </section>
  );
}
