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
import HeroIntro from "./components/HeroIntro";
import AboutDataModal from "./components/AboutDataModal";
import PatternsRail from "./components/PatternsRail";
import PatternCaption from "./components/PatternCaption";
import MobileLayout from "./layouts/MobileLayout";
import { useIsMobile, useMediaQuery } from "./lib/useMediaQuery";
import { loadWhaleData } from "./data/whaleData";
import type { WhaleRecord } from "./types/whale";
import type { Filters, FilterKey } from "./types/filters";
import { emptyFilters, SPECIES_COMMON, SPECIES_RARE } from "./types/filters";
import {
  applyStoryFiltersTo,
  getPatternBySlug,
  pointInPolygonGeometry,
} from "./data/patterns";
import {
  parse as parseShareUrl,
  type ShareableState,
} from "./lib/shareState";

const HERO_SESSION_KEY = "bws.heroSeen";
const PATTERNS_NUDGE_KEY = "bws.seenPatternsRail";

const ALL_SPECIES_LIST: readonly string[] = [...SPECIES_COMMON, ...SPECIES_RARE];

// Read ?story=<slug> at module load. We never look at the URL again
// after this; the activeStorySlug becomes a normal piece of React state.
function readInitialStorySlug(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("story");
  if (!slug) return null;
  return getPatternBySlug(slug) ? slug : null;
}

// Imperatively update the ?story= URL param without triggering a
// reload. Mirrors how the Share button updates the URL elsewhere.
function syncStoryUrl(slug: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("story", slug);
  else url.searchParams.delete("story");
  window.history.replaceState(null, "", url.toString());
}

// Snapshot whether the hero should play, BEFORE first render. Once the
// user has seen it in this session, we never re-evaluate; otherwise a
// skip would bounce briefly through "playing" state on the next render.
function readShouldPlayHeroInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(HERO_SESSION_KEY) === "1") return false;
  } catch {
    // sessionStorage can throw in private mode; fall through to play.
  }
  // We can't read matchMedia here (the hook does it live below); this
  // is just an initial best-guess to avoid a flash.
  return true;
}

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

  // "About the data" modal — single instance lifted to the App so the
  // footer link, the contextual note near the map, and the mobile
  // layout all share the same modal.
  const [aboutOpen, setAboutOpen] = useState(false);
  const openAbout = useCallback(() => setAboutOpen(true), []);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  // ---------------------------------------------------------------------
  // Patterns Rail / Story mode
  //
  // A "story" is a curated view: filters frozen to a preset, map
  // panned to a specific region, an overlay shape rendered, and a
  // caption surfaced. While a story is active, the rest of the filter
  // UI is locked. Closing the story restores whatever the user had
  // configured before activation.
  //
  // The URL participates via ?story=<slug>, which we read once at
  // module load and write whenever the active slug changes. We never
  // re-read the URL afterwards.
  // ---------------------------------------------------------------------
  const [activeStorySlug, setActiveStorySlug] = useState<string | null>(() =>
    readInitialStorySlug()
  );
  // Pre-story snapshot for restoration. Lives in a ref so reads during
  // closeStory don't depend on state batching.
  const savedStateRef = useRef<{
    filters: Filters;
    selectedRange: YearRange;
    view: { lat: number; lng: number; zoom: number } | null;
  } | null>(null);
  const activeStory = useMemo(
    () => getPatternBySlug(activeStorySlug),
    [activeStorySlug]
  );

  // First-visit nudge for the Patterns Rail. Persisted across sessions
  // via localStorage so it only ever animates once per browser.
  const [nudgePatterns, setNudgePatterns] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(PATTERNS_NUDGE_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const dismissPatternsNudge = useCallback(() => {
    setNudgePatterns(false);
    try {
      window.localStorage.setItem(PATTERNS_NUDGE_KEY, "1");
    } catch {
      // best-effort
    }
  }, []);

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
      // When a story is active and declares a spatial scope, clip pins
      // to inside that polygon. This makes the visible pins, the
      // upper-right count, and the heatmap all reflect what the
      // caption is actually claiming.
      if (
        activeStory?.clipPins &&
        !pointInPolygonGeometry(r.longitude, r.latitude, activeStory.clipPins)
      )
        return false;
      // Stories that filter by free-form record content (e.g. the
      // vessel-strike corridor's locality-text match) plug a custom
      // predicate in here.
      if (activeStory?.recordPredicate && !activeStory.recordPredicate(r))
        return false;
      return true;
    });
  }, [records, selectedRange, filters, activeStory]);

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

  // ---- Story activation / close ----
  //
  // Activation snapshots the user's current filters + view, then
  // overwrites them with the story's preset. Close restores the
  // snapshot. Switching directly between stories from one to another
  // does NOT take a fresh snapshot — the saved state always reflects
  // pre-story explore mode.
  const activateStory = useCallback(
    (slug: string) => {
      const story = getPatternBySlug(slug);
      if (!story) return;

      // Toggle off if user clicks the active pill again.
      // (We read activeStorySlug fresh inside the callback — this
      // closure value is stale after the first call.)
      // Actually: pass an updater to make this race-safe.
      setActiveStorySlug((prev) => {
        if (prev === slug) {
          // Closing — restore.
          const saved = savedStateRef.current;
          if (saved) {
            setFilters(saved.filters);
            setSelectedRange(saved.selectedRange);
            if (saved.view && mapRef.current) {
              mapRef.current.flyTo(
                [saved.view.lat, saved.view.lng],
                saved.view.zoom,
                { duration: 0.7 }
              );
            }
          }
          savedStateRef.current = null;
          syncStoryUrl(null);
          return null;
        }

        // Activating — snapshot only if we're entering story mode
        // from explore (not when swapping between stories).
        if (prev === null && mapRef.current) {
          const c = mapRef.current.getCenter();
          savedStateRef.current = {
            filters,
            selectedRange,
            view: { lat: c.lat, lng: c.lng, zoom: mapRef.current.getZoom() },
          };
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
        if (mapRef.current) {
          mapRef.current.flyTo(story.mapView.center, story.mapView.zoom, {
            duration: 0.7,
          });
        }
        syncStoryUrl(slug);
        // First story activation also dismisses the nudge for good.
        if (nudgePatterns) dismissPatternsNudge();
        return slug;
      });
    },
    [filters, selectedRange, nudgePatterns, dismissPatternsNudge]
  );

  const closeStory = useCallback(() => {
    setActiveStorySlug((prev) => {
      if (prev === null) return null;
      const saved = savedStateRef.current;
      if (saved) {
        setFilters(saved.filters);
        setSelectedRange(saved.selectedRange);
        if (saved.view && mapRef.current) {
          mapRef.current.flyTo(
            [saved.view.lat, saved.view.lng],
            saved.view.zoom,
            { duration: 0.7 }
          );
        }
      } else {
        // No snapshot — user landed on this page with ?story=... so
        // there's no "before" to restore to. Reset to default explore.
        setFilters(emptyFilters());
        setSelectedRange(null);
        if (mapRef.current) {
          mapRef.current.flyTo([37.7, -122.3], 9, { duration: 0.7 });
        }
      }
      savedStateRef.current = null;
      syncStoryUrl(null);
      return null;
    });
  }, []);

  // Apply an initial ?story= once: when the page mounts with a slug
  // in the URL, we want the same activation flow (filters, fly-to)
  // to run. We do it after records load so map + filters are mounted.
  const didApplyInitialStoryRef = useRef(false);
  useEffect(() => {
    if (didApplyInitialStoryRef.current) return;
    if (!activeStorySlug) return;
    if (records.length === 0) return;
    if (!mapRef.current) return;
    didApplyInitialStoryRef.current = true;

    // Re-activate via the same path so filters/view get applied
    // (the slug is already set in state, but the side effects haven't
    // run). We bypass the toggle-off branch by clearing first.
    const story = getPatternBySlug(activeStorySlug);
    if (!story) return;
    const { filters: nextFilters, yearRange } = applyStoryFiltersTo(
      story,
      emptyFilters,
      ALL_SPECIES_LIST
    );
    setFilters(nextFilters);
    setSelectedRange(
      yearRange ? { start: yearRange[0], end: yearRange[1] } : null
    );
    // Defer the flyTo a tick so the map finishes its initial layout.
    const t = window.setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current.flyTo(story.mapView.center, story.mapView.zoom, {
        duration: 0.6,
      });
    }, 200);
    return () => window.clearTimeout(t);
  }, [activeStorySlug, records.length]);

  // Replace filters.species wholesale. Used by the species top-pill
  // quick views and by the drawer's "select only this species" rows.
  const handleSetHiddenSpecies = useCallback((next: Set<string>) => {
    setFilters((prev) => ({ ...prev, species: next }));
  }, []);

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
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)"
  );

  // Hero plays only on desktop, when the user hasn't seen it this
  // session, and when reduced-motion is not requested. Once started
  // it runs to completion (or skip).
  const [heroPlaying, setHeroPlaying] = useState<boolean>(() =>
    readShouldPlayHeroInitial()
  );

  // Hard-skip on (prefers-reduced-motion) or mobile: never render hero.
  const heroEligible = !isMobile && !prefersReducedMotion;
  const showHero = heroPlaying && heroEligible;

  const handleHeroComplete = useCallback(() => {
    try {
      window.sessionStorage.setItem(HERO_SESSION_KEY, "1");
    } catch {
      // Best effort; the in-memory flag is enough for this tab.
    }
    setHeroPlaying(false);
  }, []);

  if (records.length === 0) {
    return (
      <div className="loading-screen">
        <div className="loading-screen-inner">
          <img
            className="loading-screen-icon"
            src="/whale-icon.png"
            alt="Bay Whale Strandings"
          />
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
          onSetHiddenSpecies={handleSetHiddenSpecies}
          showBathymetry={showBathymetry}
          onToggleBathymetry={() => setShowBathymetry((v) => !v)}
          showShippingLanes={showShippingLanes}
          onToggleShippingLanes={() => setShowShippingLanes((v) => !v)}
          showPre2013Lanes={showPre2013Lanes}
          onTogglePre2013Lanes={() => setShowPre2013Lanes((v) => !v)}
          getShareState={getShareState}
          initialPinId={initialUrlState.pinId ?? null}
          onAboutClick={openAbout}
          activeStorySlug={activeStorySlug}
          activeStory={activeStory}
          onActivateStory={activateStory}
          onCloseStory={closeStory}
          patternsNudge={nudgePatterns}
          onDismissPatternsNudge={dismissPatternsNudge}
        />
        <AboutDataModal open={aboutOpen} onClose={closeAbout} />
        <Analytics />
      </>
    );
  }

  return (
    <div className={`app ${activeStory ? "app--story-mode" : ""}`}>
      {showHero && (
        <HeroIntro
          totalCount={records.length}
          startYear={years.min}
          onComplete={handleHeroComplete}
        />
      )}
      <Header />
      <div className="main-area">
        <LeftRail
          filters={filters}
          onToggle={handleFilterToggle}
          onClear={handleFilterClear}
          onClearAll={handleFilterClearAll}
          onSetHiddenSpecies={handleSetHiddenSpecies}
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
                    ? { type: "heatmap" }
                    : null
              : null
          }
          storyAnnotations={activeStory?.annotations}
          pinHighlight={
            activeStory?.overlay.type === "pin-recolor"
              ? activeStory.overlay.predicate
              : null
          }
        />
        <SpeciesFilter
          hidden={filters.species}
          onSetHidden={handleSetHiddenSpecies}
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
            summaryOverride={activeStory?.summaryOverride}
          />
        </div>
        <TimelineSlider
          min={years.min}
          max={years.max}
          value={selectedRange}
          onChange={setSelectedRange}
          yearCounts={yearCounts}
        />
        {/* Patterns rail — curated stories, one click activates a
            preset filter+map+overlay+caption combo. */}
        <PatternsRail
          activeSlug={activeStorySlug}
          onActivate={activateStory}
          firstVisit={nudgePatterns}
          onDismissNudge={dismissPatternsNudge}
          variant="desktop"
        />
        {activeStory && (
          <PatternCaption
            story={activeStory}
            onClose={closeStory}
            variant="desktop"
          />
        )}

        {/* Bottom-edge gradient lifts the attribution off whatever
            basemap region is underneath, without coloring the map. */}
        <div className="map-fadeout" aria-hidden="true" />
        {/* Single corner attribution block — data + basemap stacked,
            equal visual weight, both right-aligned. */}
        <footer className="map-attribution">
          <div className="map-attribution-line">
            Data: NOAA Fisheries (WCR-MMSN), accessed{" "}
            {/* TODO: derive this from a build-time data-update constant
                once the ingest sets one. Hardcoded to match the dataset
                we're shipping with. */}
            April 2026
            {" · "}
            <button
              type="button"
              className="map-attribution-btn"
              onClick={openAbout}
            >
              About the data
            </button>
          </div>
          <div className="map-attribution-line">
            Basemap{" "}
            <a
              href="https://carto.com/attributions"
              target="_blank"
              rel="noopener noreferrer"
            >
              © CARTO
            </a>
            {" · "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              © OpenStreetMap contributors
            </a>
          </div>
        </footer>
      </div>
      <AboutDataModal open={aboutOpen} onClose={closeAbout} />
      <Analytics />
    </div>
  );
}
