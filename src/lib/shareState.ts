// Shareable URL state for Bay Whale Strandings.
//
// Design: the URL is NEVER auto-updated. It only changes when the
// user explicitly clicks "Share view", and only shows params when
// someone opens a link produced that way. On page load we parse
// incoming params once, then leave the URL alone forever.
//
// Both directions are lossless for supported fields:
//   parse(serialize(state)) deep-equals state
// and `serialize` of a default state produces an empty URLSearchParams.

import type { Filters } from "../types/filters";
import {
  SPECIES_COMMON,
  SPECIES_RARE,
  emptyFilters,
} from "../types/filters";
import type { YearRange } from "../App";

// ---------------------------------------------------------------------------
// Slug dictionaries
// Map canonical in-app values ↔ URL slugs. When adding new data values
// (species, county, etc.), extend these tables so the slug is explicit
// and short rather than a naive lowercased-name.
// ---------------------------------------------------------------------------

const SPECIES_SLUG: Record<string, string> = {
  "Gray whale": "gray",
  "Humpback whale": "humpback",
  "Fin whale": "fin",
  "Sperm whale": "sperm",
  "Minke whale": "minke",
  "Killer whale": "killer",
  "Blue whale": "blue",
  "Pygmy sperm whale": "pygmysperm",
  "Cuvier's beaked whale": "cuviers",
  "Hubbs' beaked whale": "hubbs",
  "Baird's beaked whale": "bairds",
  "Bryde's whale": "brydes",
  "Unidentified whale": "unid",
  "Unidentified baleen whale": "unidbaleen",
  "Unidentified fin/sei whale": "unidfinsei",
};

const COUNTY_SLUG: Record<string, string> = {
  Marin: "marin",
  "San Mateo": "sanmateo",
  "San Francisco": "sf",
  Sonoma: "sonoma",
  Alameda: "alameda",
  "Contra Costa": "contracosta",
  "Santa Clara": "santaclara",
  Solano: "solano",
};

const FINDINGS_SLUG: Record<string, string> = {
  "Vessel strike": "vessel",
  "Entanglement / fishery": "entanglement",
  "Other human interaction": "otherhuman",
  "No human interaction reported": "nohuman",
  "Undetermined / CBD": "undetermined",
};

const AGE_SLUG: Record<string, string> = {
  Adult: "adult",
  Subadult: "subadult",
  "Pup/Calf": "calf",
  Yearling: "yearling",
  Unknown: "unknown",
};

const SEX_SLUG: Record<string, string> = {
  Female: "f",
  Male: "m",
  Unknown: "unknown",
};

const AFFILIATION_SLUG: Record<string, string> = {
  "California Academy of Sciences": "calacad",
  "The Marine Mammal Center": "mmc",
  "NMFS West Coast Region - Long Beach": "nmfs",
  "Citizen (SW)": "citizen",
};

// Location-confidence values live under `value` (e.g. "actual") with a
// friendlier label ("Exact") shown in UI. URL uses its own short slug.
const CONFIDENCE_SLUG: Record<string, string> = {
  actual: "exact",
  estimated: "approx",
  mixed: "mixed",
};

function invert(m: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) out[v] = k;
  return out;
}

const SLUG_TO_SPECIES = invert(SPECIES_SLUG);
const SLUG_TO_COUNTY = invert(COUNTY_SLUG);
const SLUG_TO_FINDINGS = invert(FINDINGS_SLUG);
const SLUG_TO_AGE = invert(AGE_SLUG);
const SLUG_TO_SEX = invert(SEX_SLUG);
const SLUG_TO_AFFILIATION = invert(AFFILIATION_SLUG);
const SLUG_TO_CONFIDENCE = invert(CONFIDENCE_SLUG);

const ALL_SPECIES = [...SPECIES_COMMON, ...SPECIES_RARE];

// ---------------------------------------------------------------------------
// Types + defaults
// ---------------------------------------------------------------------------

export interface AppLayers {
  bathymetry: boolean;
  shippingLanes: boolean;
  pre2013Lanes: boolean;
}

export interface AppView {
  lat: number;
  lng: number;
  zoom: number;
}

export interface ShareableState {
  filters: Filters;
  year: YearRange;
  layers: AppLayers;
  view: AppView | null;
  pinId: string | null;
}

// Default center/zoom. Must match WhaleMap's BAY_CENTER / BAY_ZOOM.
export const DEFAULT_VIEW: AppView = { lat: 37.7, lng: -122.3, zoom: 9 };

export function defaultState(): ShareableState {
  return {
    filters: emptyFilters(),
    year: null,
    layers: { bathymetry: false, shippingLanes: false, pre2013Lanes: false },
    view: null,
    pinId: null,
  };
}

// A view is "at default" if rounding matches the default exactly.
// Lat/lng compared at 2 decimals (~1.1 km), zoom at integer.
function viewMatchesDefault(v: AppView | null): boolean {
  if (v === null) return true;
  return (
    Math.round(v.lat * 100) === Math.round(DEFAULT_VIEW.lat * 100) &&
    Math.round(v.lng * 100) === Math.round(DEFAULT_VIEW.lng * 100) &&
    Math.round(v.zoom) === DEFAULT_VIEW.zoom
  );
}

// ---------------------------------------------------------------------------
// Serialize: state → URLSearchParams
// Omits any param whose value equals the default and sorts keys so the
// same logical state always produces byte-identical URLs.
// ---------------------------------------------------------------------------

export function serialize(state: ShareableState): URLSearchParams {
  const entries: [string, string][] = [];

  // species: store the VISIBLE subset when ANY species is hidden.
  // (Internally `filters.species` is the set of hidden species.)
  if (state.filters.species.size > 0) {
    const visible = ALL_SPECIES.filter((s) => !state.filters.species.has(s));
    const slugs = visible
      .map((s) => SPECIES_SLUG[s])
      .filter(Boolean)
      .sort();
    if (slugs.length > 0) entries.push(["species", slugs.join(",")]);
  }

  // year: single year or range.
  if (state.year !== null) {
    if (state.year.start === state.year.end) {
      entries.push(["year", String(state.year.start)]);
    } else {
      entries.push(["year", `${state.year.start}-${state.year.end}`]);
    }
  }

  // month: sorted 1–12.
  if (state.filters.month.size > 0) {
    const months = Array.from(state.filters.month)
      .filter((m) => m >= 1 && m <= 12)
      .sort((a, b) => a - b);
    if (months.length > 0) entries.push(["month", months.join(",")]);
  }

  // Generic "Set<string> → slugged list" encoder.
  const encodeSet = (
    key: string,
    values: Set<string>,
    dict: Record<string, string>
  ) => {
    if (values.size === 0) return;
    const slugs = Array.from(values)
      .map((v) => dict[v])
      .filter(Boolean)
      .sort();
    if (slugs.length > 0) entries.push([key, slugs.join(",")]);
  };

  encodeSet("county", state.filters.county, COUNTY_SLUG);
  encodeSet("findings", state.filters.findings, FINDINGS_SLUG);
  encodeSet("age", state.filters.ageClass, AGE_SLUG);
  encodeSet("sex", state.filters.sex, SEX_SLUG);
  encodeSet("affiliation", state.filters.affiliation, AFFILIATION_SLUG);
  encodeSet("conf", state.filters.locationConfidence, CONFIDENCE_SLUG);

  // Layers: comma list; omit when no layer is on.
  const layers: string[] = [];
  if (state.layers.bathymetry) layers.push("bath");
  if (state.layers.shippingLanes) layers.push("ship");
  if (state.layers.pre2013Lanes) layers.push("ship_pre2013");
  if (layers.length > 0) entries.push(["layers", layers.sort().join(",")]);

  // View: only include when user has moved away from default.
  if (state.view && !viewMatchesDefault(state.view)) {
    const lat = Math.round(state.view.lat * 100) / 100;
    const lng = Math.round(state.view.lng * 100) / 100;
    const zoom = Math.round(state.view.zoom);
    entries.push(["view", `${lat},${lng},${zoom}`]);
  }

  // Pin: stable source record id.
  if (state.pinId) entries.push(["pin", state.pinId]);

  // Sort for determinism.
  entries.sort(([a], [b]) => a.localeCompare(b));
  const params = new URLSearchParams();
  for (const [k, v] of entries) params.set(k, v);
  return params;
}

// ---------------------------------------------------------------------------
// Parse: URLSearchParams → Partial<ShareableState>
// Silently drops unknown keys / invalid values (never throws).
// ---------------------------------------------------------------------------

function decodeSet<T>(
  raw: string | null,
  dict: Record<string, T>
): Set<T> | null {
  if (!raw) return null;
  const out = new Set<T>();
  for (const slug of raw.split(",")) {
    const v = dict[slug.trim()];
    if (v !== undefined) out.add(v);
  }
  return out.size > 0 ? out : null;
}

export function parse(params: URLSearchParams): Partial<ShareableState> {
  const result: Partial<ShareableState> = {};
  const filters: Partial<Filters> = {};

  // species: URL holds the VISIBLE subset, so invert to get HIDDEN.
  const speciesRaw = params.get("species");
  if (speciesRaw) {
    const visible = speciesRaw
      .split(",")
      .map((s) => SLUG_TO_SPECIES[s.trim()])
      .filter(Boolean);
    if (visible.length > 0) {
      const hidden = ALL_SPECIES.filter((s) => !visible.includes(s));
      filters.species = new Set(hidden);
    }
  }

  // year: "2019" or "2015-2020".
  const yearRaw = params.get("year");
  if (yearRaw) {
    const rangeMatch = yearRaw.match(/^(\d{4})-(\d{4})$/);
    const singleMatch = yearRaw.match(/^(\d{4})$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start >= 1900 && end <= 2100 && start <= end) {
        result.year = { start, end };
      }
    } else if (singleMatch) {
      const y = parseInt(singleMatch[1], 10);
      if (y >= 1900 && y <= 2100) {
        result.year = { start: y, end: y };
      }
    }
  }

  // month: 1..12
  const monthRaw = params.get("month");
  if (monthRaw) {
    const months = new Set<number>();
    for (const s of monthRaw.split(",")) {
      const n = parseInt(s, 10);
      if (n >= 1 && n <= 12) months.add(n);
    }
    if (months.size > 0) filters.month = months;
  }

  const countyDecoded = decodeSet(params.get("county"), SLUG_TO_COUNTY);
  if (countyDecoded) filters.county = countyDecoded;

  const findingsDecoded = decodeSet(params.get("findings"), SLUG_TO_FINDINGS);
  if (findingsDecoded) filters.findings = findingsDecoded;

  const ageDecoded = decodeSet(params.get("age"), SLUG_TO_AGE);
  if (ageDecoded) filters.ageClass = ageDecoded;

  const sexDecoded = decodeSet(params.get("sex"), SLUG_TO_SEX);
  if (sexDecoded) filters.sex = sexDecoded;

  const affDecoded = decodeSet(
    params.get("affiliation"),
    SLUG_TO_AFFILIATION
  );
  if (affDecoded) filters.affiliation = affDecoded;

  const confDecoded = decodeSet(params.get("conf"), SLUG_TO_CONFIDENCE);
  if (confDecoded) filters.locationConfidence = confDecoded;

  // Merge filters object if anything was set.
  if (Object.keys(filters).length > 0) {
    result.filters = { ...emptyFilters(), ...filters } as Filters;
  }

  // Layers: comma-separated short tokens.
  const layersRaw = params.get("layers");
  if (layersRaw) {
    const tokens = new Set(layersRaw.split(",").map((s) => s.trim()));
    const layers: AppLayers = {
      bathymetry: tokens.has("bath"),
      shippingLanes: tokens.has("ship"),
      pre2013Lanes: tokens.has("ship_pre2013"),
    };
    if (layers.bathymetry || layers.shippingLanes || layers.pre2013Lanes) {
      result.layers = layers;
    }
  }

  // View: "lat,lng,zoom" — three finite numbers in reasonable ranges.
  const viewRaw = params.get("view");
  if (viewRaw) {
    const [latS, lngS, zoomS] = viewRaw.split(",");
    const lat = parseFloat(latS);
    const lng = parseFloat(lngS);
    const zoom = parseFloat(zoomS);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Number.isFinite(zoom) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      zoom >= 1 &&
      zoom <= 20
    ) {
      result.view = { lat, lng, zoom };
    }
  }

  // Pin: any non-empty string. Validity (whether it resolves to a
  // real record) is checked later at hydration time.
  const pinRaw = params.get("pin");
  if (pinRaw && pinRaw.trim().length > 0) {
    result.pinId = pinRaw.trim();
  }

  return result;
}

// ---------------------------------------------------------------------------
// buildShareUrl: full "https://www.baywhales.org/" or "...?…"
// Bare home URL when no params (i.e., default state).
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.baywhales.org";

export function buildShareUrl(state: ShareableState): string {
  const params = serialize(state);
  // URLSearchParams encodes commas as %2C. Commas are legal in URL
  // query values (RFC 3986 "sub-delims") and much more readable raw,
  // so we swap them back — matches the schema's example links.
  const qs = params.toString().replace(/%2C/g, ",");
  return qs ? `${BASE_URL}/?${qs}` : `${BASE_URL}/`;
}

// ---------------------------------------------------------------------------
// summarize: human-readable preview shown in the share popover.
// Falls back to "Default view" when nothing has been changed.
// ---------------------------------------------------------------------------

export function summarize(
  state: ShareableState,
  recordCount: number
): string {
  const parts: string[] = [];
  parts.push(
    `${recordCount} stranding${recordCount === 1 ? "" : "s"}`
  );

  // Species summary: either "all species" (omit), or the visible group names.
  if (state.filters.species.size > 0) {
    const visible = ALL_SPECIES.filter(
      (s) => !state.filters.species.has(s)
    );
    if (visible.length === 0) parts.push("no species");
    else if (visible.length === 1) parts.push(visible[0]);
    else if (visible.length <= 3) parts.push(`${visible.length} species`);
    else parts.push(`${visible.length} species`);
  }

  // Year.
  if (state.year !== null) {
    if (state.year.start === state.year.end) parts.push(String(state.year.start));
    else parts.push(`${state.year.start}\u2013${state.year.end}`);
  }

  // County summary.
  if (state.filters.county.size > 0) {
    const arr = Array.from(state.filters.county);
    if (arr.length <= 2) parts.push(arr.join(" + "));
    else parts.push(`${arr.length} counties`);
  }

  // Other filter groups — just show a count badge so the popover stays short.
  const moreCounts: string[] = [];
  const maybe = (label: string, n: number) => {
    if (n > 0) moreCounts.push(`${n} ${label}`);
  };
  maybe("month", state.filters.month.size);
  maybe("finding", state.filters.findings.size);
  maybe("age", state.filters.ageClass.size);
  maybe("sex", state.filters.sex.size);
  maybe("org", state.filters.affiliation.size);
  maybe("confidence", state.filters.locationConfidence.size);
  if (moreCounts.length > 0) parts.push(moreCounts.join(", "));

  // Pin.
  if (state.pinId) parts.push(`pin ${state.pinId}`);

  return parts.length === 1 ? `${parts[0]} · default view` : parts.join(" · ");
}
