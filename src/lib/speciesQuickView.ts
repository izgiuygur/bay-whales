// Quick-view selector logic for the species filter.
//
// The top species pills act as RADIO-style quick views: at most one
// pill is "active" at any time, and clicking a pill replaces the
// current hidden set with the one that pill represents. The drawer's
// species section is the multi-select escape hatch — when the user
// makes a selection there that doesn't match a quick view, no pill
// reads as active.
//
// We continue to model `filters.species` as the set of HIDDEN species
// (consistent with the rest of the app and the share-URL contract).
// `hidden = ∅`            → All species (default)
// `hidden = ALL \ {Gray}`  → Gray whale only
// `hidden = ALL \ {Hump}`  → Humpback whale only
// `hidden = ALL \ {Fin}`   → Fin whale only
// `hidden = FEATURED`      → Other only

import { FEATURED_SPECIES } from "../types/whale";
import { SPECIES_COMMON, SPECIES_RARE } from "./../types/filters";

export const ALL_SPECIES: readonly string[] = [
  ...SPECIES_COMMON,
  ...SPECIES_RARE,
];

export const OTHER_SPECIES: readonly string[] = [
  ...SPECIES_COMMON.filter((s) => !FEATURED_SPECIES.includes(s as never)),
  ...SPECIES_RARE,
];

export type QuickView =
  | "all"
  | "Gray whale"
  | "Humpback whale"
  | "Fin whale"
  | "other";

/** Build the hidden set that represents a given quick view. */
export function hiddenForQuickView(view: QuickView): Set<string> {
  if (view === "all") return new Set();
  if (view === "other") return new Set(FEATURED_SPECIES);
  // Single-featured-species view: hide everything except the picked one.
  return new Set(ALL_SPECIES.filter((s) => s !== view));
}

/**
 * Detect whether a given hidden-set exactly matches one of the quick
 * views. Returns null for any custom multi-select state.
 */
export function detectQuickView(hidden: Set<string>): QuickView | null {
  if (hidden.size === 0) return "all";

  // "Other" view: every featured species hidden, every other species visible.
  const allFeaturedHidden = FEATURED_SPECIES.every((s) => hidden.has(s));
  const noOtherHidden = OTHER_SPECIES.every((s) => !hidden.has(s));
  if (allFeaturedHidden && noOtherHidden) return "other";

  // Single-featured-only view: exactly one species visible, and it's a featured one.
  const visibleCount = ALL_SPECIES.length - hidden.size;
  if (visibleCount === 1) {
    for (const sp of FEATURED_SPECIES) {
      if (!hidden.has(sp)) return sp;
    }
  }
  return null;
}
