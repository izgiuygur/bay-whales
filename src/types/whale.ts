export interface WhaleRecord {
  id: string;
  /** Network member's local field number, e.g. "CAS-RB-5599" or
   *  "TMMC-C-199". Used in popups for researcher reference. */
  fieldId: string;
  dateObserved: string;
  year: number;
  month: number;
  monthName: string;
  species: string;
  speciesOriginal: string;
  county: string;
  city: string;
  localityDetail: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  coordQuality: "actual" | "estimated" | "mixed" | "missing";
  sex: string;
  ageClass: string;
  conditionAtExam: string;
  humanInteraction: string;
  boatCollision: string;
  fisheryInteraction: string;
  entangled: string;
  causeDetermination: string;
  affiliation: string;
  additionalRemarks: string;
}

export type SpeciesKey = "Gray whale" | "Humpback whale" | "Fin whale";

export const SPECIES_COLORS: Record<SpeciesKey, { passive: string; active: string; pin: string }> = {
  "Gray whale": { passive: "#DBCDF8", active: "#8D72C5", pin: "#A48DD3" },
  "Humpback whale": { passive: "#C6DBF0", active: "#4FA7FF", pin: "#80B4E8" },
  "Fin whale": { passive: "#D8E688", active: "#BAD41F", pin: "#B5CC2E" },
};

export const FEATURED_SPECIES: SpeciesKey[] = [
  "Gray whale",
  "Humpback whale",
  "Fin whale",
];

// Color used for the "Other" pill and for every non-featured species
// dot in the drawer. Matches the fallback pin color on the map.
export const OTHER_SPECIES_COLOR = "#4a4a4a";

// Drawer-style dot color (legend swatch beside species names on
// white). Featured species use their `pin` (medium) shade.
export function getSpeciesDotColor(species: string): string {
  if (species in SPECIES_COLORS) {
    return SPECIES_COLORS[species as SpeciesKey].pin;
  }
  return OTHER_SPECIES_COLOR;
}
