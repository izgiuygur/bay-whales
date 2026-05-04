// Patterns Rail config — curated stories about the strandings data.
//
// Each PatternEntry describes a fully self-contained "story": it bundles
// the filters to apply, the map view to fly to, the overlay shape, and
// the editorial caption. Adding a new story = adding a new entry. The
// component layer reads this config and never looks elsewhere.
//
// Phase 1 ships ONE pattern (Pill #1, Gray whales found a new stop).
// Phases 2–4 add more patterns and methodology pills.
//
// Numbers in caption copy were verified against the live dataset on
// 2026-04-30 using a strict "inside the Golden Gate" Bay box. See the
// project notes for the verification queries.

import type { Filters, FilterKey } from "../types/filters";
import type { WhaleRecord } from "../types/whale";

// Story chrome blue — same brand royal blue as the timeline so all
// blue UI reads as one visual language.
export const STORY_BLUE = "#0051BA";

export type StoryFilterSpec = {
  /** Species to SHOW. Internally we'll invert this to filters.species (hidden set). */
  species?: string[];
  /** Inclusive year range. */
  yearRange?: [number, number] | null;
  months?: number[];
  county?: string[];
  findings?: string[];
};

export type PatternIcon =
  | "whale"
  | "humpback"
  | "ship"
  | "calendar"
  | "spike"
  | "magnifier"
  | "info"
  | "question";

export type PatternOverlay =
  | {
      type: "blob";
      /** GeoJSON polygon describing the highlight shape. */
      geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
    }
  | {
      type: "corridor";
      geometry: GeoJSON.LineString | GeoJSON.Polygon;
    }
  | { type: "heatmap" }
  | {
      type: "pin-recolor";
      /** Predicate evaluated per-record; true = highlighted (story-blue),
       *  false = de-emphasized (grey + low opacity). The predicate is
       *  the message — its proportion or location carries the
       *  methodology story. */
      predicate: (r: WhaleRecord) => boolean;
    }
  | { type: "none" };

/**
 * A small map annotation rendered while a story is active. Use to label
 * geographic context (refineries, landmarks, regions) so the polygon
 * reads as a story you can decode off the map, not just a tinted shape.
 *
 * Annotations sit above the overlay polygon but below the stranding pins
 * — they're context, not data.
 */
export interface PatternAnnotation {
  lat: number;
  lon: number;
  label: string;
  /** Visual treatment of the marker dot. Default "marker" (plain circle). */
  icon?: "ship" | "refinery" | "marker";
  /**
   * Direction to offset the label from the marker dot.
   * Default "right". Use to keep labels away from pin clusters.
   */
  labelDir?: "left" | "right" | "top" | "bottom";
}

export interface PatternEntry {
  /** URL-safe id, used by the ?story=<slug> param. */
  slug: string;
  /** Visual treatment family — solid for patterns, outlined for methodology. */
  type: "pattern" | "methodology";
  icon: PatternIcon;
  /** 3–6 words. Pill label. */
  headline: string;
  /** ~10–15 words. Hover/long-press tooltip and caption subhead. */
  subhead: string;
  /** 2–3 sentences. Renders in the caption panel. */
  caption: string;
  link?: { label: string; url: string };
  filters: StoryFilterSpec;
  mapView: { center: [number, number]; zoom: number };
  overlay: PatternOverlay;
  /** Optional spatial constraint. When set, while the story is active
   *  ONLY records whose lat/lng fall inside this polygon participate in
   *  the filtered set — so the visible pins, the upper-right count,
   *  and the heatmap (if any) all reflect the editorial scope. The
   *  caption can then truthfully say "X strandings inside the Bay". */
  clipPins?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  /** Optional record-level predicate. When set, only records for
   *  which this returns true participate in the active story's
   *  filtered set. Use this when the natural filter is content-based
   *  (e.g. "anything mentioning a refinery in its locality text")
   *  rather than fitting one of the structured filter dimensions. */
  recordPredicate?: (r: WhaleRecord) => boolean;
  /** Optional map annotations (named landmarks, refineries, etc.).
   *  Render above the overlay polygon but below pins. */
  annotations?: PatternAnnotation[];
  /** Optional human-readable summary chip for the upper-right card.
   *  When set, replaces the auto-generated chip list (e.g. "Marin"
   *  + comma-separated others) with a single editorial label like
   *  "Rare species" or "Confirmed human interaction". The year range
   *  prefix and stranding count stay auto-generated. */
  summaryOverride?: string;
}

// ---------------------------------------------------------------------------
// Point-in-polygon (ray-casting). Standard implementation; no deps.
// Coordinates are GeoJSON [lon, lat] pairs.
// ---------------------------------------------------------------------------
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInPolygonGeometry(
  lng: number,
  lat: number,
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon
): boolean {
  if (geom.type === "Polygon") {
    if (!pointInRing(lng, lat, geom.coordinates[0])) return false;
    for (let i = 1; i < geom.coordinates.length; i++) {
      if (pointInRing(lng, lat, geom.coordinates[i])) return false;
    }
    return true;
  }
  // MultiPolygon
  for (const poly of geom.coordinates) {
    if (!pointInRing(lng, lat, poly[0])) continue;
    let inHole = false;
    for (let i = 1; i < poly.length; i++) {
      if (pointInRing(lng, lat, poly[i])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Editorial geometries
//
// Hand-traced for editorial use, not survey-grade. The blobs and the
// vessel-strike corridor are wide on purpose so they read as "general
// region" rather than "exact boundary".
// ---------------------------------------------------------------------------

// SF Bay polygon. Western boundary is the entrance line from Point
// Bonita (~37.815°N, -122.530°W) to Point Lobos / Lands End (~37.785°N,
// -122.510°W) — the actual mouth of the Golden Gate. We anchor the
// line ~1km east of Point Bonita itself so a stranding right at Point
// Bonita lighthouse reads as outer-coast, not in-Bay (otherwise the
// 2024-08 humpback at Point Bonita falls just barely inside the line,
// which would be journalistically misleading).
const SF_BAY_POLYGON: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      // [lon, lat] — counterclockwise from the GG north anchor.
      [-122.520, 37.815],   // Just east of Point Bonita (north anchor)
      // Marin shore north → east
      [-122.50, 37.93],
      [-122.48, 38.04],
      [-122.42, 38.08],
      [-122.32, 38.12],
      // Carquinez / Suisun
      [-122.05, 38.13],
      [-121.85, 38.12],
      [-121.85, 38.00],
      [-122.05, 37.95],
      // East Bay shore south
      [-122.18, 37.86],
      [-122.10, 37.65],
      [-122.05, 37.45],
      [-122.06, 37.40],
      // South Bay west shore north
      [-122.18, 37.45],
      [-122.32, 37.60],
      [-122.42, 37.78],
      // Lands End anchor
      [-122.510, 37.785],
      [-122.520, 37.815],   // close
    ],
  ],
};

// (The previous corridor polygon — a buffered convex hull around the
// matched records — was retired when the story dropped its overlay
// shape in favor of letting the clustered pins + named annotations
// carry the visual.)

// Regex used by the corridor story's record predicate. Word-boundary
// "berth N" form to avoid the "wide berth" nautical idiom; explicit
// rejection of "chevron, caudal" (anatomical reference, not the
// refinery).
const CORRIDOR_KEYWORDS =
  /refinery|wharf|Port of Oakland|Oakland Harbor|Phillips 66|Chevron|berth \d/i;
const CORRIDOR_FALSE_POSITIVE = /chevron,\s*caudal/i;

// (Outer-coast migration band geometry was removed — Pill #5 ships
// without a shape because the seasonality message is about timing,
// not place.)

// ---------------------------------------------------------------------------
// Pattern entries
// ---------------------------------------------------------------------------

export const PATTERNS: PatternEntry[] = [
  {
    slug: "gray-whales-bay",
    type: "pattern",
    icon: "whale",
    headline: "Gray whales found a new stop",
    subhead:
      "Before 2018, gray whale strandings inside SF Bay were rare. Since then, dozens.",
    // Numbers verified 2026-04-30 against live data with strict
    // inside-the-Golden-Gate Bay box: 7 pre-2018 in-Bay, 44 since 2019.
    caption:
      "Through 2017, only 10 gray whale strandings had ever been recorded inside San Francisco Bay. Since 2018, 47 more have been found there, often emaciated — overlapping the NOAA-declared 2019–2023 Gray Whale Unusual Mortality Event. Researchers think hungry whales may be using the Bay as a foraging refuge during their northbound migration.",
    link: {
      label: "NOAA Gray Whale UME",
      url: "https://www.fisheries.noaa.gov/national/marine-life-distress/2019-2023-gray-whale-unusual-mortality-event-along-west-coast",
    },
    filters: {
      species: ["Gray whale"],
      yearRange: [2018, 2025],
    },
    mapView: { center: [37.83, -122.32], zoom: 10 },
    overlay: { type: "blob", geometry: SF_BAY_POLYGON },
    clipPins: SF_BAY_POLYGON,
  },
  {
    slug: "spring-2025-cluster",
    type: "pattern",
    icon: "spike",
    headline: "Spring 2025 spike",
    subhead:
      "March–June 2025 had about 15 gray whale strandings inside the Bay — the densest cluster on record.",
    // Numbers verified 2026-04-30: 15 gray strandings inside SF Bay
    // proper Mar–Jun 2025; next-densest spring is 2019 with 9.
    caption:
      "Between March and June 2025, about 17 gray whale strandings were recorded inside San Francisco Bay — more than any previous spring in the dataset, concentrated near Angel Island, the Oakland approach, and the Golden Gate. Many were emaciated. Whether it represents a new mortality event or a continuation of the post-2019 trend is still under investigation by NOAA and the Marine Mammal Center.",
    link: {
      label: "Marine Mammal Center: stranding response",
      url: "https://www.marinemammalcenter.org/science-conservation/conservation/cetacean-conservation/stranding-necropsy",
    },
    filters: {
      species: ["Gray whale"],
      yearRange: [2025, 2025],
      months: [3, 4, 5, 6],
    },
    mapView: { center: [37.85, -122.42], zoom: 10.5 },
    overlay: { type: "heatmap" },
    clipPins: SF_BAY_POLYGON,
  },
  {
    slug: "vessel-strike-corridor",
    type: "pattern",
    icon: "ship",
    headline: "An industrial corridor",
    subhead:
      "Refinery docks and shipping lanes from Carquinez to Oakland show repeated waterfront strandings.",
    caption:
      "Strandings repeatedly turn up at the same handful of industrial waterfront sites — Phillips 66 and Chevron refinery docks in San Pablo Bay, and Port of Oakland berths. Of the 11 strandings recorded at these sites since 2005, four are confirmed vessel strikes — most famously the 2010 fin whale pinned to the bow of the cargo ship Northern Vitality at Oakland berth 57. The remaining seven have no confirmed cause but were physically wedged into pier pilings, dock undersides, or against ship hulls. The geographic clustering is consistent with vessel strikes and infrastructure interactions being a structural risk, even where individual cases go undocumented. Even at industrial waterfront sites where vessel strike is most plausible, only about a third of cases are confirmed.",
    link: {
      label: "NOAA: Reducing vessel strikes",
      url: "https://www.fisheries.noaa.gov/national/endangered-species-conservation/reducing-vessel-strikes-large-whales",
    },
    // No structured filters — the predicate (locality text mentioning
    // refineries / wharves / Oakland berths) IS the filter.
    filters: {},
    recordPredicate: (r) => {
      const blob = `${r.localityDetail} | ${r.additionalRemarks} | ${r.city}`;
      if (CORRIDOR_FALSE_POSITIVE.test(blob)) return false;
      return CORRIDOR_KEYWORDS.test(blob);
    },
    // Center on the Richmond/Berkeley axis with a slightly tighter
    // frame so all three annotations (Phillips 66 in the north,
    // Chevron in the middle, Port of Oakland to the south) sit
    // comfortably on screen — but loose enough to keep SF / Oakland
    // / Marin labels visible for spatial context.
    mapView: { center: [37.93, -122.36], zoom: 10.5 },
    // No overlay polygon — the three named annotations + the
    // clustered pins carry the story without the editorial shape.
    overlay: { type: "none" },
    summaryOverride: "Refinery docks & port berths",
    annotations: [
      // Phillips 66 Rodeo Refinery — 1290 San Pablo Ave, Rodeo, CA.
      // The refinery itself sits on the south shore of San Pablo Bay
      // (not in the channel — the marine terminal at Davis Point is
      // about 1km north in the water, but the labeled landmark should
      // be the refinery on land).
      {
        lat: 38.0331,
        lon: -122.2607,
        label: "Phillips 66 Refinery",
        icon: "refinery",
        labelDir: "right",
      },
      // Chevron Long Wharf — seaward tip. The wharf trestle runs from
      // the Richmond refinery shoreline (~ -122.388°W) west-southwest
      // about 1.2 km into San Pablo Bay; the seaward berthing
      // platform sits at approximately (37.9261°N, -122.4079°W).
      {
        lat: 37.9261,
        lon: -122.4079,
        label: "Chevron Long Wharf",
        icon: "ship",
        labelDir: "right",
      },
      // Port of Oakland — inner harbor berths. Label LEFT (west, into
      // the bay) so it sits clear of the cluster of berth pins to the
      // east of the annotation point.
      {
        lat: 37.80,
        lon: -122.31,
        label: "Port of Oakland",
        icon: "ship",
        labelDir: "left",
      },
    ],
  },
  {
    slug: "spring-stranding-season",
    type: "pattern",
    icon: "calendar",
    headline: "Spring stranding peak",
    subhead:
      "Most gray whale strandings happen during the northbound spring migration.",
    // Verified 2026-04-30: 75% of all gray whale strandings in the
    // dataset occur in March, April, or May.
    caption:
      "Roughly three-quarters of gray whale strandings in this dataset happen in March, April, or May — during the species' northbound migration from Mexican calving lagoons to Arctic feeding grounds. Humpback strandings cluster later, in summer and fall, when humpbacks are foraging off California. The Bay Area sits on a migration bottleneck, so what you see in spring is largely the migration itself.",
    link: {
      label: "NOAA: Gray whale species profile",
      url: "https://www.fisheries.noaa.gov/species/gray-whale",
    },
    filters: {
      species: ["Gray whale"],
      // Spring narrowing — the pill is about spring season, so the
      // visible pins should reflect that. Without the month filter
      // the user just saw all gray strandings and had to read the
      // caption to learn the spring claim.
      months: [3, 4, 5],
    },
    // Pulled out to show the full Bay Area extent — the migration
    // story plays across the outer coast, not inside any one harbor.
    mapView: { center: [37.85, -122.7], zoom: 9 },
    // No overlay — the seasonality story is about timing, not place.
    // The filtered pins (Gray whales, all years) are the message;
    // adding a shape didn't help readers and was distracting.
    overlay: { type: "none" },
  },
  {
    slug: "humpbacks-following",
    type: "pattern",
    icon: "humpback",
    headline: "Humpbacks crossed in",
    subhead:
      "For a decade, humpback strandings were outer-coast only. They're now appearing inside the Bay.",
    // Numbers verified 2026-04-30: 0 humpback strandings inside SF Bay
    // proper before 2015; first inside-the-Golden-Gate record is 2016
    // at lat 37.82, lon -122.478 — directly under the bridge.
    caption:
      "Through 2015, humpback strandings inside SF Bay had never been recorded. Then in a four-year window — 2016, 2017, and 2019 — three were found there: two near the Golden Gate Bridge and one near Alcatraz Island. None have stranded inside the Bay since. It's far too sparse to call a trend, but it's a notable break from a decade of zero.",
    link: {
      label: "Cascadia: California humpbacks",
      url: "https://cascadiaresearch.org/projects/california-humpback-whales/",
    },
    filters: {
      species: ["Humpback whale"],
      yearRange: [2016, 2025],
    },
    mapView: { center: [37.83, -122.45], zoom: 10 },
    overlay: { type: "blob", geometry: SF_BAY_POLYGON },
    clipPins: SF_BAY_POLYGON,
  },
  // ---------------------------------------------------------------------
  // Methodology pills — meta-observations about how the data was
  // collected. Visually quieter (outlined / dashed pills); all use the
  // pin-recolor overlay so the proportion or location of the
  // highlighted pins is the story.
  // ---------------------------------------------------------------------
  {
    slug: "species-mix-narrowed",
    type: "methodology",
    icon: "magnifier",
    headline: "Species mix has narrowed",
    subhead:
      "Early years had more deep-water species. Recent years are mostly Gray and Humpback — partly real, partly reporting changes.",
    caption:
      "The 2005–2014 records include Cuvier's beaked, Hubbs' beaked, Bryde's, Pygmy sperm, Sperm, Killer, and Blue whales. Recent years are dominated by Gray and Humpback. Some of this likely reflects real shifts — population changes, behavioral shifts, marine heatwave effects — but some reflects changes in how strandings are reported and categorized over twenty years. Treat the apparent narrowing as a hypothesis, not a fact.",
    filters: {
      // The nine non-featured, non-unidentified species. Excludes
      // Gray / Humpback / Fin (the featured trio) and the three
      // "Unidentified*" buckets, which dilute the message.
      species: [
        "Cuvier's beaked whale",
        "Hubbs' beaked whale",
        "Baird's beaked whale",
        "Bryde's whale",
        "Sperm whale",
        "Killer whale",
        "Blue whale",
        "Pygmy sperm whale",
        "Minke whale",
      ],
    },
    // Show the full Bay Area extent — the message is dataset-wide,
    // not geographic.
    mapView: { center: [37.7, -122.3], zoom: 9 },
    overlay: { type: "none" },
    summaryOverride: "Rare species",
  },
  {
    slug: "marin-monitored",
    type: "methodology",
    icon: "info",
    headline: "Marin: monitored, not deadlier",
    subhead:
      "A large share of records cluster at Point Reyes because NPS staff actively patrol there.",
    caption:
      "Marin County, especially Point Reyes National Seashore, accounts for nearly 40% of strandings in this dataset — almost two in five. That's partly because PRNS staff actively patrol the beaches and report carcasses promptly. Counties with less monitoring almost certainly under-report. Read the geographic distribution as \"where strandings are seen\" more than \"where strandings happen.\"",
    link: {
      label: "NOAA: West Coast stranding network",
      url: "https://www.fisheries.noaa.gov/west-coast/marine-life-distress/marine-mammal-stranding-network",
    },
    filters: { county: ["Marin"] },
    // Center on the Marin coast / PRNS area — that's where most of
    // the 83 Marin pins concentrate.
    mapView: { center: [38.0, -122.85], zoom: 9 },
    overlay: { type: "none" },
    summaryOverride: "Marin only",
  },
  {
    slug: "cause-of-death-unknown",
    type: "methodology",
    icon: "question",
    headline: "Most causes aren't confirmed",
    subhead:
      "Confirmed human-caused deaths are a documented minimum, not a count.",
    // Verified 2026-04-30: 90 records (41.5%) have any human-interaction
    // flag set. Caption's "about 41%" / "the other 59%" remains accurate.
    caption:
      "Only about 41% of strandings in this dataset have a confirmed human cause (vessel strike, entanglement, or similar). For the other 59%, the cause was natural, unknown, or impossible to determine — many carcasses are too decomposed to assess, or are never recovered for examination. That means the \"vessel strike\" and \"entanglement\" filters elsewhere on this map are showing documented minimums; the real numbers are almost certainly higher.",
    link: {
      label: "Marine Mammal Center: necropsy",
      url: "https://www.marinemammalcenter.org/science-conservation/conservation/cetacean-conservation/stranding-necropsy",
    },
    filters: {
      // The findings filter uses OR semantics — setting all three
      // human-interaction options matches every record with any HI
      // flag set (boat_collision / entangled / fishery / other-HI).
      findings: [
        "Vessel strike",
        "Entanglement / fishery",
        "Other human interaction",
      ],
    },
    mapView: { center: [37.7, -122.3], zoom: 9 },
    overlay: { type: "none" },
    summaryOverride: "Confirmed human interaction",
  },
];

export function getPatternBySlug(slug: string | null | undefined): PatternEntry | null {
  if (!slug) return null;
  return PATTERNS.find((p) => p.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Translate a story's filter spec into the app's Filters shape.
// `species` in StoryFilterSpec is a SHOW-set; we invert to a hidden-set
// to match filters.species semantics.
// ---------------------------------------------------------------------------
export function applyStoryFiltersTo(
  story: PatternEntry,
  emptyFilters: () => Filters,
  allSpecies: readonly string[]
): { filters: Filters; yearRange: [number, number] | null } {
  const next = emptyFilters();
  const spec = story.filters;
  if (spec.species && spec.species.length > 0) {
    const show = new Set(spec.species);
    next.species = new Set(allSpecies.filter((s) => !show.has(s)));
  }
  if (spec.county) {
    (next as Record<FilterKey, Set<string | number>>).county = new Set(spec.county);
  }
  if (spec.findings) {
    (next as Record<FilterKey, Set<string | number>>).findings = new Set(spec.findings);
  }
  if (spec.months) {
    (next as Record<FilterKey, Set<string | number>>).month = new Set(spec.months);
  }
  return { filters: next, yearRange: spec.yearRange ?? null };
}
