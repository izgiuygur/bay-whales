import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type L from "leaflet";
import { Analytics } from "@vercel/analytics/react";
import SpeciesFilter from "../components/SpeciesFilter";
import WhaleMap from "../components/WhaleMap";
import TimelineSlider from "../components/TimelineSlider";
import PatternCaption from "../components/PatternCaption";
import { loadWhaleData } from "../data/whaleData";
import type { WhaleRecord } from "../types/whale";
import type { Filters } from "../types/filters";
import { emptyFilters, SPECIES_COMMON, SPECIES_RARE } from "../types/filters";
import {
  applyStoryFiltersTo,
  getPatternBySlug,
  pointInPolygonGeometry,
} from "../data/patterns";
import type { YearRange } from "../App";

const ALL_SPECIES_LIST: readonly string[] = [...SPECIES_COMMON, ...SPECIES_RARE];

// Hand-picked story slugs shown as pills below the map. Order is
// the order they render. Each must match an entry in patterns.ts.
const FEATURED_STORY_SLUGS = [
  "marin-monitored",
  "cause-of-death-unknown",
  "warm-seas",
] as const;

// Same filter logic as App.tsx but inlined here so the embed doesn't
// depend on the full app shell. (Could be extracted later if a third
// surface needs it.)
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
  if (findings.has("Undetermined / CBD") && record.humanInteraction === "CBD")
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

/**
 * Slimmed-down layout used by /embed and served to magazine partners
 * via <iframe>. Compared to the full App layout:
 *   - No hero animation, no first-visit nudges
 *   - No header subtitle, no big footer
 *   - No patterns rail — a single story is auto-activated from the
 *     ?story= param (default: marin-monitored)
 *   - No advanced drawer, no share button, no about-data modal
 *   - "Open full map" button replaces the editorial chrome
 *   - Credit line links to izgiuygur.com
 *
 * Filter state and story behavior reuse the exact same plumbing as
 * App.tsx so the embed feels identical to the full site for the
 * subset of features it exposes.
 */
export default function EmbedLayout({
  initialStorySlug,
}: {
  /** Story slug requested via the URL (?story=). If missing or
   *  unknown, the embed loads in default explore mode (no story
   *  pre-selected). */
  initialStorySlug: string | null;
}) {
  const [records, setRecords] = useState<WhaleRecord[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selectedRange, setSelectedRange] = useState<YearRange>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Active story state. Default is null (no story = default map).
  // ?story=<slug> in the URL pre-opens that story on mount.
  const [activeStorySlug, setActiveStorySlug] = useState<string | null>(() => {
    if (!initialStorySlug) return null;
    return getPatternBySlug(initialStorySlug) ? initialStorySlug : null;
  });
  const activeStory = useMemo(
    () => getPatternBySlug(activeStorySlug),
    [activeStorySlug]
  );

  // Snapshot of pre-story filter state, used to restore on close.
  // Empty by default — close goes to "all filters cleared".
  const savedStateRef = useRef<{
    filters: Filters;
    selectedRange: YearRange;
  } | null>(null);

  useEffect(() => {
    loadWhaleData().then(setRecords);
  }, []);

  // When a URL story is requested at mount, apply its filters once
  // records are loaded. Subsequent activate/close calls handle their
  // own filter changes.
  const didApplyInitialRef = useRef(false);
  useEffect(() => {
    if (didApplyInitialRef.current) return;
    if (records.length === 0) return;
    didApplyInitialRef.current = true;
    if (!activeStory) return;
    const { filters: nextFilters, yearRange } = applyStoryFiltersTo(
      activeStory,
      emptyFilters,
      ALL_SPECIES_LIST
    );
    setFilters(nextFilters);
    setSelectedRange(
      yearRange ? { start: yearRange[0], end: yearRange[1] } : null
    );
  }, [records.length, activeStory]);

  // Activate a story: snapshot current state (if entering from
  // default), apply the story's filter preset, and surface the
  // caption. Clicking the active pill again closes the story.
  const closeStory = useCallback(() => {
    if (activeStorySlug === null) return;
    const saved = savedStateRef.current;
    if (saved) {
      setFilters(saved.filters);
      setSelectedRange(saved.selectedRange);
    } else {
      setFilters(emptyFilters());
      setSelectedRange(null);
    }
    savedStateRef.current = null;
    setActiveStorySlug(null);
  }, [activeStorySlug]);
  const activateStory = useCallback(
    (slug: string) => {
      const story = getPatternBySlug(slug);
      if (!story) return;
      didApplyInitialRef.current = true;
      if (activeStorySlug === slug) {
        closeStory();
        return;
      }
      // Snapshot only when entering from default; switching between
      // stories preserves the original pre-story state.
      if (activeStorySlug === null) {
        savedStateRef.current = { filters, selectedRange };
      }
      const { filters: nextFilters, yearRange } = applyStoryFiltersTo(
        story,
        emptyFilters,
        ALL_SPECIES_LIST
      );
      setFilters(nextFilters);
      setSelectedRange(
        yearRange ? { start: yearRange[0], end: yearRange[1] } : null
      );
      setActiveStorySlug(slug);
    },
    [activeStorySlug, closeStory, filters, selectedRange]
  );

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
      if (filters.species.has(r.species)) return false;
      if (filters.month.size > 0 && !filters.month.has(r.month)) return false;
      if (filters.county.size > 0 && !filters.county.has(r.county)) return false;
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
      if (
        activeStory?.clipPins &&
        !pointInPolygonGeometry(r.longitude, r.latitude, activeStory.clipPins)
      )
        return false;
      if (activeStory?.recordPredicate && !activeStory.recordPredicate(r))
        return false;
      return true;
    });
  }, [records, selectedRange, filters, activeStory]);

  const handleSetHiddenSpecies = useCallback((next: Set<string>) => {
    setFilters((prev) => ({ ...prev, species: next }));
  }, []);

  // Tell search engines not to index the embed surface — it's a
  // partner-facing variant, not a canonical page. Injected at runtime
  // so the main site's <head> stays unchanged.
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex,nofollow";
    document.head.appendChild(tag);
    return () => {
      document.head.removeChild(tag);
    };
  }, []);

  // Broadcast content height to the embedding page so smart hosts
  // can auto-fit the iframe. Standard listener pattern (iframe-resizer
  // and similar libraries pick this up out of the box). No-op when
  // not in an iframe.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.parent === window) return;
    const broadcast = () => {
      const h = document.documentElement.scrollHeight;
      window.parent.postMessage({ baywhales: { height: h } }, "*");
    };
    broadcast();
    const ro = new ResizeObserver(broadcast);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  // Build the "Open full map" deep link. Preserves the active story
  // so the article's contextual framing carries over to the full
  // site; falls back to the bare home URL in default explore mode.
  const fullMapHref = activeStorySlug
    ? `https://baywhales.org/?story=${encodeURIComponent(activeStorySlug)}`
    : "https://baywhales.org/";

  // Resolve the featured-story configs once for the pill row.
  const featuredStories = useMemo(
    () =>
      FEATURED_STORY_SLUGS.map((slug) => getPatternBySlug(slug)).filter(
        (s): s is NonNullable<typeof s> => !!s
      ),
    []
  );

  if (records.length === 0) {
    return (
      <div className="embed-loading">
        <div className="embed-loading-spinner" aria-hidden="true" />
        <div className="embed-loading-text">Loading data…</div>
      </div>
    );
  }

  return (
    <div className="embed-root">
      <header className="embed-header">
        <span className="embed-title">Bay Whale Strandings</span>
        <a
          href={fullMapHref}
          target="_blank"
          rel="noopener noreferrer"
          className="embed-open-full"
        >
          Open full map <span aria-hidden="true">↗</span>
        </a>
      </header>

      <div className="embed-main">
        <WhaleMap
          records={filtered}
          showBathymetry={false}
          showShippingLanes={false}
          showPre2013Lanes={false}
          initialView={null}
          initialPinId={null}
          mapRef={mapRef}
          storyOverlay={
            activeStory
              ? activeStory.overlay.type === "blob"
                ? { type: "blob", geometry: activeStory.overlay.geometry }
                : activeStory.overlay.type === "corridor"
                  ? {
                      type: "corridor",
                      geometry: activeStory.overlay.geometry as
                        | GeoJSON.Polygon
                        | GeoJSON.MultiPolygon,
                    }
                  : activeStory.overlay.type === "heatmap"
                    ? {
                        type: "heatmap",
                        color: activeStory.overlay.color,
                        colorFor: activeStory.overlay.colorFor,
                        radius: activeStory.overlay.radius,
                        fillOpacity: activeStory.overlay.fillOpacity,
                      }
                    : null
              : null
          }
          storyAnnotations={activeStory?.annotations}
          pinHighlight={
            activeStory?.overlay.type === "pin-recolor"
              ? activeStory.overlay.predicate
              : null
          }
          pinColorFor={activeStory?.pinColorFor}
        />

        <div className="embed-controls">
          <div className="embed-count">
            Showing <strong>{filtered.length}</strong> stranding
            {filtered.length !== 1 ? "s" : ""}
          </div>
          <SpeciesFilter
            hidden={filters.species}
            onSetHidden={handleSetHiddenSpecies}
          />
        </div>

        <TimelineSlider
          min={years.min}
          max={years.max}
          value={selectedRange}
          onChange={setSelectedRange}
          yearCounts={yearCounts}
          yearMarkers={activeStory?.yearMarkers}
        />

        {activeStory && (
          <PatternCaption
            story={activeStory}
            onClose={closeStory}
            variant="desktop"
          />
        )}
      </div>

      {/* Three featured stories below the map. Clicking opens the
          story; clicking the active one again closes it. */}
      <nav className="embed-stories" aria-label="Featured stories">
        {featuredStories.map((p) => {
          const isActive = activeStorySlug === p.slug;
          return (
            <button
              key={p.slug}
              type="button"
              className={`embed-story-pill ${isActive ? "is-active" : ""}`}
              onClick={() => activateStory(p.slug)}
              aria-pressed={isActive}
              title={p.subhead}
            >
              <span className="embed-story-pill-label">{p.headline}</span>
              <span className="embed-story-pill-arrow" aria-hidden="true">
                {isActive ? "×" : "→"}
              </span>
            </button>
          );
        })}
      </nav>

      <footer className="embed-credit">
        Bay Whale Strandings by{" "}
        <a
          href="https://izgiuygur.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Izgi Uygur
        </a>
        {" · "}
        <a
          href="https://www.fisheries.noaa.gov/west-coast/marine-life-distress/marine-mammal-stranding-network"
          target="_blank"
          rel="noopener noreferrer"
        >
          Data: NOAA WCR-MMSN
        </a>
      </footer>

      <Analytics />
    </div>
  );
}
