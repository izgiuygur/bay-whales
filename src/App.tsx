import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type L from "leaflet";
import { Analytics } from "@vercel/analytics/react";
import Header from "./components/Header";
import SpeciesFilter from "./components/SpeciesFilter";
import LeftRail from "./components/LeftRail";
import WhaleMap from "./components/WhaleMap";
import TimelineSlider from "./components/TimelineSlider";
import RecordCount from "./components/RecordCount";
import ShareButton from "./components/ShareButton";
import MobileLayout from "./layouts/MobileLayout";
import { useIsMobile } from "./lib/useMediaQuery";
import { loadWhaleData } from "./data/whaleData";
import type { WhaleRecord } from "./types/whale";
import type { Filters, FilterKey } from "./types/filters";
import { emptyFilters } from "./types/filters";
import {
  parse as parseShareUrl,
  type ShareableState,
} from "./lib/shareState";

// Snapshot the URL ONCE at module load — we never read it again after
// hydration. This decouples any subsequent render from the location.
const initialUrlState = (() => {
  if (typeof window === "undefined") return {};
  return parseShareUrl(new URLSearchParams(window.location.search));
})();

function matchesFindings(record: WhaleRecord, findings: Set<string>): boolean {
  if (findings.size === 0) return true;
  if (findings.has("Vessel strike") && record.boatCollision === "Y") return true;
  if (
    findings.has("Entanglement / fishery") &&
    (record.entangled === "Y" || record.fisheryInteraction === "Y")
  )
    return true;
  if (
    findings.has("Other human interaction") &&
    record.humanInteraction === "Y" &&
    record.boatCollision !== "Y" &&
    record.entangled !== "Y" &&
    record.fisheryInteraction !== "Y"
  )
    return true;
  if (
    findings.has("No human interaction reported") &&
    record.humanInteraction !== "Y"
  )
    return true;
  if (
    findings.has("Undetermined / CBD") &&
    record.humanInteraction === "CBD"
  )
    return true;
  return false;
}

function matchesLocationConfidence(
  record: WhaleRecord,
  lc: Set<string>
): boolean {
  if (lc.size === 0) return true;
  return lc.has(record.coordQuality);
}

export type YearRange = { start: number; end: number } | null;

export default function App() {
  const [records, setRecords] = useState<WhaleRecord[]>([]);
  const [selectedRange, setSelectedRange] = useState<YearRange>(
    initialUrlState.year ?? null
  );
  const [filters, setFilters] = useState<Filters>(() => ({
    ...emptyFilters(),
    ...(initialUrlState.filters ?? {}),
  }));
  const [showBathymetry, setShowBathymetry] = useState(
    initialUrlState.layers?.bathymetry ?? false
  );
  const [showShippingLanes, setShowShippingLanes] = useState(
    initialUrlState.layers?.shippingLanes ?? false
  );
  const [showPre2013Lanes, setShowPre2013Lanes] = useState(
    initialUrlState.layers?.pre2013Lanes ?? false
  );
  // Live reference to the Leaflet map instance — used by Share button
  // to snapshot the current view. We never write to it.
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    loadWhaleData().then(setRecords);
  }, []);

  const years = useMemo(() => {
    const yrs = records.map((r) => r.year).filter((y) => y > 0);
    if (yrs.length === 0) return { min: 2005, max: 2025 };
    return { min: Math.min(...yrs), max: Math.max(...yrs) };
  }, [records]);

  const yearCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let y = years.min; y <= years.max; y++) counts[y] = 0;
    for (const r of records) {
      if (r.year >= years.min && r.year <= years.max) {
        counts[r.year] = (counts[r.year] || 0) + 1;
      }
    }
    return counts;
  }, [records, years]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (
        selectedRange !== null &&
        (r.year < selectedRange.start || r.year > selectedRange.end)
      )
        return false;
      // filters.species holds species the user has explicitly HIDDEN
      // (empty = all species visible by default).
      if (filters.species.has(r.species)) return false;
      if (filters.month.size > 0 && !filters.month.has(r.month)) return false;
      if (filters.county.size > 0 && !filters.county.has(r.county))
        return false;
      if (!matchesFindings(r, filters.findings)) return false;
      if (filters.ageClass.size > 0 && !filters.ageClass.has(r.ageClass))
        return false;
      if (filters.sex.size > 0 && !filters.sex.has(r.sex)) return false;
      if (
        filters.affiliation.size > 0 &&
        !filters.affiliation.has(r.affiliation)
      )
        return false;
      if (!matchesLocationConfidence(r, filters.locationConfidence))
        return false;
      return true;
    });
  }, [records, selectedRange, filters]);

  const handleFilterToggle = useCallback(
    (key: FilterKey, value: string | number) => {
      setFilters((prev) => {
        const next = { ...prev };
        const set = new Set(prev[key] as Set<any>);
        if (set.has(value)) {
          set.delete(value);
        } else {
          set.add(value);
        }
        (next as any)[key] = set;
        return next;
      });
    },
    []
  );

  const handleFilterClear = useCallback((key: FilterKey) => {
    setFilters((prev) => {
      const next = { ...prev };
      (next as any)[key] = new Set();
      return next;
    });
  }, []);

  const handleFilterClearAll = useCallback(() => {
    setFilters(emptyFilters());
  }, []);

  // Bulk-toggle a group of species in filters.species.
  // When `makeHidden` is true, adds every species in `group` to the hidden
  // set. When false, removes every species in `group` from the set.
  const handleSpeciesGroupToggle = useCallback(
    (group: string[], makeHidden: boolean) => {
      setFilters((prev) => {
        const set = new Set(prev.species);
        for (const s of group) {
          if (makeHidden) set.add(s);
          else set.delete(s);
        }
        return { ...prev, species: set };
      });
    },
    []
  );

  // Snapshot of everything the share URL represents RIGHT NOW.
  // The Share button calls this at click time; the URL is not
  // touched anywhere else.
  const getShareState = useCallback((): ShareableState => {
    const map = mapRef.current;
    let view = null;
    if (map) {
      const c = map.getCenter();
      const z = map.getZoom();
      view = { lat: c.lat, lng: c.lng, zoom: z };
    }
    return {
      filters,
      year: selectedRange,
      layers: {
        bathymetry: showBathymetry,
        shippingLanes: showShippingLanes,
        pre2013Lanes: showPre2013Lanes,
      },
      view,
      pinId: null,
    };
  }, [filters, selectedRange, showBathymetry, showShippingLanes, showPre2013Lanes]);

  const isMobile = useIsMobile();

  if (records.length === 0) {
    return (
      <div className="loading-screen">
        <div className="loading-screen-inner">
          <div className="loading-screen-icon" role="img" aria-label="whale">
            🐳
          </div>
          <div className="loading-screen-title">Bay Whale Strandings</div>
          <div className="loading-screen-spinner" aria-hidden="true" />
          <div className="loading-screen-text">Loading data…</div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <MobileLayout
          records={filtered}
          totalRecords={records.length}
          years={years}
          yearCounts={yearCounts}
          selectedRange={selectedRange}
          onYearChange={setSelectedRange}
          filters={filters}
          onFilterToggle={handleFilterToggle}
          onFilterClear={handleFilterClear}
          onFilterClearAll={handleFilterClearAll}
          onToggleSpeciesGroup={handleSpeciesGroupToggle}
          showBathymetry={showBathymetry}
          onToggleBathymetry={() => setShowBathymetry((v) => !v)}
          showShippingLanes={showShippingLanes}
          onToggleShippingLanes={() => setShowShippingLanes((v) => !v)}
          showPre2013Lanes={showPre2013Lanes}
          onTogglePre2013Lanes={() => setShowPre2013Lanes((v) => !v)}
          getShareState={getShareState}
          initialPinId={initialUrlState.pinId ?? null}
        />
        <Analytics />
      </>
    );
  }

  return (
    <div className="app">
      <Header />
      <div className="main-area">
        <LeftRail
          filters={filters}
          onToggle={handleFilterToggle}
          onClear={handleFilterClear}
          onClearAll={handleFilterClearAll}
          showBathymetry={showBathymetry}
          onToggleBathymetry={() => setShowBathymetry((v) => !v)}
          showShippingLanes={showShippingLanes}
          onToggleShippingLanes={() => setShowShippingLanes((v) => !v)}
          showPre2013Lanes={showPre2013Lanes}
          onTogglePre2013Lanes={() => setShowPre2013Lanes((v) => !v)}
        />
        <WhaleMap
          records={filtered}
          showBathymetry={showBathymetry}
          showShippingLanes={showShippingLanes}
          showPre2013Lanes={showPre2013Lanes}
          initialView={
            initialUrlState.view
              ? initialUrlState.view
              : // Fall back to a defined null so the prop always passes.
                null
          }
          initialPinId={initialUrlState.pinId ?? null}
          mapRef={mapRef}
        />
        <SpeciesFilter
          hidden={filters.species}
          onToggleSpecies={(species) => handleFilterToggle("species", species)}
          onToggleGroup={handleSpeciesGroupToggle}
          onReset={() => handleFilterClear("species")}
        />
        <div className="top-right-cluster">
          <ShareButton
            getState={getShareState}
            recordCount={filtered.length}
          />
          <RecordCount
            count={filtered.length}
            yearMin={years.min}
            yearMax={years.max}
            selectedRange={selectedRange}
            filters={filters}
          />
        </div>
        <TimelineSlider
          min={years.min}
          max={years.max}
          value={selectedRange}
          onChange={setSelectedRange}
          yearCounts={yearCounts}
        />
      </div>
      <Analytics />
    </div>
  );
}
