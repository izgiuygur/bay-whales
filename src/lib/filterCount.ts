import { SPECIES_COMMON, SPECIES_RARE } from "../types/filters";

// Total species the user can filter on. `SPECIES_COMMON` and
// `SPECIES_RARE` together cover every species the data set uses.
export const TOTAL_SPECIES_COUNT =
  SPECIES_COMMON.length + SPECIES_RARE.length;

// Species filter contributes the COUNT OF SELECTED species
// (i.e. total - hidden). Matches the convention used by
// month/county/etc. filters whose Set.size IS the selected count.
// At default (nothing hidden), contribution is 0 → no badge shows.
export function countSelectedSpecies(hidden: Set<string>): number {
  if (hidden.size === 0) return 0;
  return Math.max(0, TOTAL_SPECIES_COUNT - hidden.size);
}
