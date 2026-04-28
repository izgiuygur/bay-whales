import Papa from "papaparse";
import type { WhaleRecord } from "../types/whale";

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function titleCase(raw: string): string {
  if (!raw || !raw.trim()) return "";
  return raw
    .toLowerCase()
    .split("/")
    .map((part) =>
      part
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    )
    .join("/");
}

function normalizeSpecies(raw: string): string {
  if (!raw) return "Unknown";
  // Format: "Whale, gray" → "Gray whale"
  const match = raw.match(/^Whale,\s*(.+)$/i);
  if (match) {
    const name = match[1].trim();
    return name.charAt(0).toUpperCase() + name.slice(1) + " whale";
  }
  if (raw.toLowerCase().includes("unidentified") || raw.toLowerCase().includes("mysticete")) {
    return "Unidentified whale";
  }
  return raw;
}

function deriveCoordQuality(
  latQuality: string,
  lonQuality: string
): WhaleRecord["coordQuality"] {
  if (!latQuality || !lonQuality) return "missing";
  const lat = latQuality.toLowerCase().trim();
  const lon = lonQuality.toLowerCase().trim();
  if (lat === "actual" && lon === "actual") return "actual";
  if (lat === "estimate" && lon === "estimate") return "estimated";
  return "mixed";
}

function deriveCause(row: Record<string, string>): string {
  const parts: string[] = [];
  if (row.human_interaction === "Y") {
    if (row.boat_collision === "Y") parts.push("Boat collision");
    if (row.entangled === "Y") parts.push("Entanglement");
    if (row.fishery_interaction === "Y") parts.push("Fishery interaction");
    if (row.ingestion === "Y") parts.push("Ingestion");
    if (row.shot === "Y") parts.push("Shot");
    if (row.other_human_interaction === "Y" && row.other_human_interaction_desc) {
      parts.push(row.other_human_interaction_desc.trim());
    }
    if (parts.length === 0) parts.push("Human interaction");
  }
  if (row.condition_at_exam) {
    parts.push(row.condition_at_exam.trim());
  }
  return parts.join(" · ") || "Unknown";
}

function parseCoord(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  let cleaned = raw.trim().replace(/[()]/g, "").trim();

  // Degrees-minutes format: "38 05.140" → 38 + 5.14/60
  const dmMatch = cleaned.match(/^(-?\d+)\s+(\d+(?:\.\d+)?)$/);
  if (dmMatch) {
    const deg = parseFloat(dmMatch[1]);
    const min = parseFloat(dmMatch[2]);
    return deg + min / 60;
  }

  // Remove stray spaces in decimal: "122. 414094" → "122.414094"
  cleaned = cleaned.replace(/\.\s+/, ".");

  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function normalizeRow(row: Record<string, string>, index: number): WhaleRecord | null {
  let lat = parseCoord(row.latitude);
  let lon = parseCoord(row.longitude);
  if (lat === null || lon === null) return null;
  // Ensure longitude is negative (west) for Bay Area
  if (lon > 0) lon = -lon;

  const dateStr = (row.date_observed || "").replace(" 00:00:00", "");
  const date = new Date(dateStr);
  const year = isNaN(date.getTime()) ? 0 : date.getFullYear();
  const month = isNaN(date.getTime()) ? 0 : date.getMonth() + 1;

  const city = row.city || "";
  const county = row.county || "";
  const locality = row.locality_detail || "";
  const locationLabel = locality || city || county || "Unknown location";

  return {
    id: row.source_record_id || `whale-${index}`,
    fieldId: (row.field_id || "").trim(),
    dateObserved: dateStr,
    year,
    month,
    monthName: MONTH_NAMES[month] || "",
    species: normalizeSpecies(row.species_original || ""),
    speciesOriginal: row.species_original || "",
    county,
    city,
    localityDetail: locality,
    locationLabel,
    latitude: lat,
    longitude: lon,
    coordQuality: deriveCoordQuality(
      row.latitude_quality_raw,
      row.longitude_quality_raw
    ),
    sex: titleCase(row.sex) || "Unknown",
    ageClass: titleCase(row.age_class) || "Unknown",
    conditionAtExam: row.condition_at_exam || "",
    humanInteraction: row.human_interaction || "",
    boatCollision: row.boat_collision || "",
    fisheryInteraction: row.fishery_interaction || "",
    entangled: row.entangled || "",
    causeDetermination: deriveCause(row),
    affiliation: row.affiliation || "",
    additionalRemarks: row.additional_remarks || "",
  };
}

export async function loadWhaleData(): Promise<WhaleRecord[]> {
  const response = await fetch("/whale-data.csv");
  const csvText = await response.text();

  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const records = results.data
          .map((row, i) => normalizeRow(row as Record<string, string>, i))
          .filter((r): r is WhaleRecord => r !== null);
        resolve(records);
      },
    });
  });
}
