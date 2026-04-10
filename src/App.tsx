import { useState, useEffect, useMemo, useCallback } from "react";
import Header from "./components/Header";
import SpeciesFilter from "./components/SpeciesFilter";
import LeftRail from "./components/LeftRail";
import WhaleMap from "./components/WhaleMap";
import TimelineSlider from "./components/TimelineSlider";
import RecordCount from "./components/RecordCount";
import MobileFallback from "./components/MobileFallback";
import { loadWhaleData } from "./data/whaleData";
import type { WhaleRecord, SpeciesKey } from "./types/whale";
import type { Filters, FilterKey } from "./types/filters";
import { emptyFilters } from "./types/filters";

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
  const [activeSpecies, setActiveSpecies] = useState<Set<string>>(new Set());
  const [selectedRange, setSelectedRange] = useState<YearRange>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showBathymetry, setShowBathymetry] = useState(false);
  const [showShippingLanes, setShowShippingLanes] = useState(false);
  const [showPre2013Lanes, setShowPre2013Lanes] = useState(false);

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
      if (activeSpecies.size > 0 && !activeSpecies.has(r.species)) return false;
      // Drawer filters
      if (filters.species.size > 0 && !filters.species.has(r.species))
        return false;
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
  }, [records, activeSpecies, selectedRange, filters]);

  const handleSpeciesToggle = (species: SpeciesKey) => {
    setActiveSpecies((prev) => {
      const next = new Set(prev);
      if (next.has(species)) {
        next.delete(species);
      } else {
        next.add(species);
      }
      return next;
    });
  };

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

  return (
    <div className="app">
      <MobileFallback />
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
        />
        <SpeciesFilter
          active={activeSpecies}
          onToggle={handleSpeciesToggle}
          onClearAll={() => setActiveSpecies(new Set())}
        />
        <RecordCount
          count={filtered.length}
          yearMin={years.min}
          yearMax={years.max}
          selectedRange={selectedRange}
          activeSpecies={activeSpecies}
          filters={filters}
        />
        <TimelineSlider
          min={years.min}
          max={years.max}
          value={selectedRange}
          onChange={setSelectedRange}
          yearCounts={yearCounts}
        />
      </div>
    </div>
  );
}
