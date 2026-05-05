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
  | "question"
  | "thermometer";

/** Per-year decoration drawn on the year strip / timeline while a
 *  pattern is active. Used by the marine-heatwave story to mark
 *  heatwave years with size-encoded blobs. Story-scoped: hidden in
 *  default explore mode. */
export interface YearMarker {
  year: number;
  intensity: "mild" | "medium" | "strong";
  /** Hover tooltip. e.g. "Marine heatwave: 2015 — strong (Blob peak)" */
  label?: string;
}

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
  | {
      type: "heatmap";
      /** Uniform halo fill color. Defaults to brand blue. */
      color?: string;
      /** Per-record halo color picker. When set, takes precedence
       *  over `color`. Use this when halo color should encode an
       *  attribute of the record (e.g. intensity-by-year for
       *  warm-seas → halo color matches the timeline blob). */
      colorFor?: (r: WhaleRecord) => string;
      /** Per-pin halo radius in meters. Larger values produce more
       *  cluster overlap / accumulation. Default 600. */
      radius?: number;
      /** Per-pin halo fill opacity. Lower values let overlapping
       *  halos accumulate more visibly. Default 0.14. */
      fillOpacity?: number;
    }
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
  /** Optional per-year markers drawn on the year strip / timeline
   *  while the story is active. Used to overlay temporal context
   *  (e.g. marine heatwave years) on top of the stranding counts. */
  yearMarkers?: YearMarker[];
  /** Optional per-record pin color override. Returns the hex color
   *  used for that record's pin while the story is active. Takes
   *  precedence over the species-default color but NOT over the
   *  black "selected" pin. Story-scoped — pins revert to species
   *  colors when the story closes. */
  pinColorFor?: (r: WhaleRecord) => string;
  /** Optional human-readable summary chip for the upper-right card.
   *  When set, replaces the auto-generated chip list (e.g. "Marin"
   *  + comma-separated others) with a single editorial label like
   *  "Rare species" or "Confirmed human interaction". The year range
   *  prefix and stranding count stay auto-generated. */
  summaryOverride?: string;
  /** Optional replacement for the year-range portion of the summary
   *  line. Default behavior renders something like "2005–2025" or
   *  "2018–2025" derived from selectedRange. Use this when the
   *  story's "year scope" isn't a contiguous range — e.g.
   *  "9 marine heatwave years". Combined with `summaryOverride` this
   *  gives full editorial control over the line. */
  summaryYearLabel?: string;
  /** When true, this story does NOT apply its predicate / clipPins
   *  to the year-strip count bars (so the bars show every year's
   *  raw count for context), AND the timeline stays at full
   *  contrast + interactive while the story is active. Used by
   *  stories whose value comes from comparing the filtered map
   *  pins against the un-filtered year-distribution — the warm-seas
   *  story is the canonical case. */
  keepTimelineActive?: boolean;
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

// Years used by the warm-seas story's record predicate. Single source
// of truth — the year-marker list below uses the same year set with
// per-year intensity classifications.
//
// Source: NOAA Integrated Ecosystem Assessment, California Current
// Marine Heatwave Tracker
//   https://www.integratedecosystemassessment.noaa.gov/regions/california-current/california-current-marine-heatwave-tracker-blobtracker
//
// Heatwave definition (per the IEA tracker):
//   "Blob-Class" MHW = strength > 1.29 SD of the SSTa field
//   (top 90%, consistent with Hobday et al. 2016) AND area
//   > 400,000 km².
//
// Region: California Current Large Marine Ecosystem (~32–42°N,
//         116–126°W).
//
// Climatology baseline: not explicitly published on the IEA tracker
// page. ERDDAP-derived OISST v2.1 annual anomalies typically use
// 1991–2020. Per-year average anomaly values would require a one-off
// ERDDAP pull (out of scope here); intensity classifications below
// are based on documented event extents and named-event records.
//
// Year-by-year notes:
//   2014, 2015, 2016 — "The Blob" event. 2015 was the regional peak
//                      (~+3°C anomaly mean across CC; localized
//                      peaks 5–6°C per Gentemann et al. 2017).
//   2019           — "Blob 2.0" — among the largest on record.
//   2020           — Smaller heatwave; La Niña context.
//   2021           — "Southern Blob" — among the largest.
//   2022, 2023, 2024 — Sustained large heatwaves (IEA: each of
//                       2019–2025 had MHW activity in the CC).
//   2025           — NEP25A — record-setting.
//
// 2025 / NEP25A claims — verified verbatim against the IEA tracker
// page (URL above) on 2026-05-04:
//
//   • Designation:
//     "Large portions of the coastal region along the US west coast,
//      particularly off central and southern California, continue to
//      be impacted by the large marine heatwave NEP25A … which we
//      have tracked since May 2025."
//
//   • Peak area + record claim:
//     "NEP25A reached a maximum size of ~10 Million km^2 on Sept. 10,
//      2025, setting a record for largest maximum area for a marine
//      heatwave within the Northeast Pacific region analyzed here …
//      since monitoring began in 1982."
//
// "NEP25A" is the official NOAA IEA event designation; the 10M km²
// peak and the "largest since 1982" claim are both directly published
// by NOAA, not inferred. No softening required.
const HEATWAVE_YEARS = new Set<number>([
  2014, 2015, 2016, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
]);

// Intensity-to-color table — three-tone burgundy gradient where
// deeper = stronger heatwave. Used by BOTH the timeline blobs (CSS)
// and the map pin colors (Leaflet markers via pinColorFor) so the
// on-strip and on-map encodings reinforce each other.
//
// Tones tuned for ~23–24 L-point gaps between tiers so individual
// pins on the map read as clearly different tiers — same separation
// principle as the rust/coral/peach palette this replaced, just in
// a more somber rose-burgundy register that fits the "elegy for
// whales" tone better than fashion-pink or fresh-orange:
//
//   strong  #8B2E4A  — deep burgundy (HSL ≈ 345° 50% 37%)
//   medium  #C0728A  — dusty rose (HSL ≈ 345° 36% 60%)
//   mild    #E8C2CD  — pale rose (HSL ≈ 345° 47% 84%)
//
// Alternatives to swap in if a different gravity is wanted (each
// derives medium/mild similarly):
//   wine     strong = #A0344A (lighter, more visible)
//   mulberry strong = #5E2A4F (grimmer, more monochrome)
//
// If you change these, also update the size-color visual coupling
// in the user-facing legend ("Larger blobs = stronger heatwave;
// hover for event details").
const HEATWAVE_INTENSITY_COLOR: Record<YearMarker["intensity"], string> = {
  mild: "#E8C2CD",
  medium: "#C0728A",
  strong: "#8B2E4A",
};
const HEATWAVE_YEAR_INTENSITY: Record<number, YearMarker["intensity"]> = {
  2014: "medium",
  2015: "strong",
  2016: "medium",
  2019: "strong",
  2020: "mild",
  2021: "strong",
  2022: "medium",
  2023: "medium",
  2024: "medium",
  2025: "strong",
};

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
    // No overlay — the 17 filtered pins themselves cluster visibly
    // enough at this zoom level to carry the "spring 2025 spike"
    // story without an extra heatmap layer underneath.
    overlay: { type: "none" },
    clipPins: SF_BAY_POLYGON,
  },
  {
    slug: "warm-seas",
    type: "pattern",
    icon: "thermometer",
    headline: "Warm seas, more strandings",
    subhead:
      "Stranding spikes follow marine heatwaves in the California Current.",
    // Caption count "(151 of 216)" matches the predicate's yield
    // under the 10-year heatwave list (per NOAA IEA, each of
    // 2019–2025 had MHW activity in the CC, plus The Blob 2014–2016).
    // Verified against live data 2026-05-04 = 151/216 = 69.9%.
    caption:
      "Stranding spikes tend to follow marine heatwaves in the California Current. About 70% of all strandings in this dataset (151 of 216) happened during ten heatwave years that account for nearly half the time period. The \"Blob\" of 2014–2016 (peaking around +3°C above baseline regionally, with local peaks 5–6°C) preceded a jump from a baseline of ~4 strandings per year to 13–14. Large heatwaves recurred annually 2019–2025; the 2025 event (NEP25A) set a record for largest area in the Northeast Pacific since monitoring began in 1982. The link isn't perfectly linear — strandings lag SST changes by months, and other factors matter (Arctic feeding, gray whale population dynamics) — but the pattern holds: warmer seas, more strandings. Larger blobs indicate stronger heatwave conditions; hover for event details.",
    link: {
      label: "NOAA: California Current marine heatwaves",
      url: "https://www.fisheries.noaa.gov/topic/climate-change/california-current-marine-heatwaves",
    },
    // No structured filter dimension fits a non-contiguous list of
    // years, so the predicate handles it. Years not in this set are
    // dropped from `filtered` (and from yearCounts, since yearCounts
    // honors recordPredicate).
    filters: {},
    recordPredicate: (r) =>
      HEATWAVE_YEARS.has(r.year),
    // Default Bay Area extent.
    mapView: { center: [37.7, -122.3], zoom: 9 },
    // No on-map editorial overlay — pins-only. Pin COLOR carries the
    // intensity story via pinColorFor below.
    overlay: { type: "none" },
    // Each pin's color encodes its year's heatwave intensity, using
    // the same pink palette as the timeline blobs. Records outside
    // the heatwave year set won't reach this layer (the predicate
    // filters them) but we fall back to medium defensively.
    pinColorFor: (r) =>
      HEATWAVE_INTENSITY_COLOR[HEATWAVE_YEAR_INTENSITY[r.year] ?? "medium"],
    summaryYearLabel: "10 marine heatwave years",
    summaryOverride: "All species",
    // The whole point of the visual is comparing heatwave-year bar
    // height to non-heatwave-year bar height — so the year strip
    // must show ALL records, not just the predicate-filtered ones.
    // Also keeps the timeline interactive so users can poke at it.
    keepTimelineActive: true,
    // Per-year heatwave classifications drawn from the same NOAA IEA
    // sources documented above. Tooltip labels include the named
    // event where one exists. Numeric anomaly values are intentionally
    // not fabricated where authoritative annual means weren't pulled —
    // see the HEATWAVE_YEARS comment block for what would source them.
    yearMarkers: [
      { year: 2014, intensity: "medium", label: "2014 — The Blob begins (medium intensity; peak ~+2.5°C anomaly Feb 2014)" },
      { year: 2015, intensity: "strong", label: "2015 — The Blob peak (strong; regional ~+3°C, local 5–6°C)" },
      { year: 2016, intensity: "medium", label: "2016 — The Blob waning (medium)" },
      { year: 2019, intensity: "strong", label: "2019 — \"Blob 2.0\" (strong; among largest on record)" },
      { year: 2020, intensity: "mild", label: "2020 — Mild heatwave (La Niña context)" },
      { year: 2021, intensity: "strong", label: "2021 — \"Southern Blob\" (strong; among largest)" },
      { year: 2022, intensity: "medium", label: "2022 — Sustained heatwave (medium)" },
      { year: 2023, intensity: "medium", label: "2023 — Sustained heatwave (medium; UME ends, lingering warmth)" },
      { year: 2024, intensity: "medium", label: "2024 — Sustained heatwave (medium)" },
      { year: 2025, intensity: "strong", label: "2025 — NEP25A (strong; record-setting, largest NEP MHW area since 1982)" },
    ],
  },
  {
    slug: "industrial-corridor",
    type: "pattern",
    icon: "ship",
    headline: "An industrial corridor",
    subhead:
      "Refinery docks and shipping lanes from Carquinez to Oakland show repeated waterfront strandings.",
    caption:
      "Strandings repeatedly turn up at the same handful of industrial waterfront sites — Phillips 66 and Chevron refinery docks in San Pablo Bay, and Port of Oakland berths. Of the 11 strandings recorded at these sites since 2005, four are confirmed vessel strikes, and a fifth (a gray whale wedged between a ship's hull and Berth 20 pilings) shows clear ship contact even though the database flag was left unset. The remaining six have no confirmed cause but were physically wedged into pier pilings, dock undersides, or against ship hulls. The geographic clustering is consistent with vessel strikes and infrastructure interactions being a structural risk, even where individual cases go undocumented. Even at industrial waterfront sites where vessel strike is most plausible, only about half show explicit vessel-strike evidence — most go unconfirmed.",
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
  {
    slug: "species-mix-narrowed",
    type: "pattern",
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
  // ---------------------------------------------------------------------
  // Methodology pills — meta-observations about how the data was
  // collected. Visually quieter (outlined / dashed pills); all use
  // filter-based behavior so the upper-right summary updates when the
  // pill activates, just like the pattern stories.
  // ---------------------------------------------------------------------
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
