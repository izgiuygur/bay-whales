export interface Filters {
  species: Set<string>;
  month: Set<number>;
  county: Set<string>;
  findings: Set<string>;
  ageClass: Set<string>;
  sex: Set<string>;
  affiliation: Set<string>;
  locationConfidence: Set<string>;
}

export function emptyFilters(): Filters {
  return {
    species: new Set(),
    month: new Set(),
    county: new Set(),
    findings: new Set(),
    ageClass: new Set(),
    sex: new Set(),
    affiliation: new Set(),
    locationConfidence: new Set(),
  };
}

export type FilterKey = keyof Filters;

// --- Filter option definitions ---

export const SPECIES_COMMON = [
  "Gray whale",
  "Humpback whale",
  "Fin whale",
  "Sperm whale",
  "Minke whale",
  "Killer whale",
  "Blue whale",
  "Pygmy sperm whale",
];

export const SPECIES_RARE = [
  "Cuvier's beaked whale",
  "Hubbs' beaked whale",
  "Baird's beaked whale",
  "Bryde's whale",
  "Unidentified whale",
  "Unidentified baleen whale",
  "Unidentified fin/sei whale",
];

// Scientific (binomial) names — source: NOAA Fisheries species directory
// https://www.fisheries.noaa.gov/species-directory/marine-mammals
export const SPECIES_SCIENTIFIC: Record<string, string> = {
  "Gray whale": "Eschrichtius robustus",
  "Humpback whale": "Megaptera novaeangliae",
  "Fin whale": "Balaenoptera physalus",
  "Sperm whale": "Physeter macrocephalus",
  "Minke whale": "Balaenoptera acutorostrata",
  "Killer whale": "Orcinus orca",
  "Blue whale": "Balaenoptera musculus",
  "Pygmy sperm whale": "Kogia breviceps",
  "Cuvier's beaked whale": "Ziphius cavirostris",
  "Hubbs' beaked whale": "Mesoplodon carlhubbsi",
  "Baird's beaked whale": "Berardius bairdii",
  "Bryde's whale": "Balaenoptera edeni",
};

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export const COUNTIES = [
  "Marin",
  "San Mateo",
  "San Francisco",
  "Sonoma",
  "Alameda",
  "Contra Costa",
  "Santa Clara",
  "Solano",
];

export const FINDINGS = [
  "Vessel strike",
  "Entanglement / fishery",
  "Other human interaction",
  "No human interaction reported",
  "Undetermined / CBD",
];

export const AGE_CLASSES = [
  "Adult",
  "Subadult",
  "Pup/Calf",
  "Yearling",
  "Unknown",
];

export const SEXES = ["Female", "Male", "Unknown"];

export const AFFILIATIONS = [
  "California Academy of Sciences",
  "The Marine Mammal Center",
  "NMFS West Coast Region - Long Beach",
  "Citizen (SW)",
];

export const LOCATION_CONFIDENCES = [
  { value: "actual", label: "Exact" },
  { value: "estimated", label: "Approximate" },
  { value: "mixed", label: "General Bay location" },
];
