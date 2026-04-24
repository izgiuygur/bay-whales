import type { WhaleRecord, SpeciesKey } from "../../types/whale";
import { SPECIES_COLORS } from "../../types/whale";

// Silhouettes — keep in sync with the desktop InfoCard map.
const SPECIES_SILHOUETTES: Record<string, string> = {
  "Gray whale": "/whale_silhouettes/gray-whale.png",
  "Humpback whale": "/whale_silhouettes/Whale-Humpback.png",
  "Fin whale": "/whale_silhouettes/fin-whale.png",
  "Sperm whale": "/whale_silhouettes/sperm-whale.png",
  "Minke whale": "/whale_silhouettes/minke-whale.png",
  "Killer whale": "/whale_silhouettes/killer-whale.png",
  "Blue whale": "/whale_silhouettes/blue-whale.png",
  "Pygmy sperm whale": "/whale_silhouettes/whale_pygmy_sperm.png",
  "Bryde's whale": "/whale_silhouettes/Whale-Brydes.png",
  "Baird's beaked whale": "/whale_silhouettes/bairds-beaked-whale.png",
  "Cuvier's beaked whale": "/whale_silhouettes/cuviers-beaked-whale.png",
  "Hubbs' beaked whale": "/whale_silhouettes/hubbs-beaked-whale.png",
  "Unidentified fin/sei whale": "/whale_silhouettes/fin-whale.png",
  "Unidentified baleen whale": "/whale_silhouettes/minke-whale.png",
  "Unidentified whale": "/whale_silhouettes/fin-whale.png",
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTint(species: string): string {
  if (species in SPECIES_COLORS) {
    return hexToRgba(SPECIES_COLORS[species as SpeciesKey].pin, 0.12);
  }
  return "rgba(74, 74, 74, 0.1)";
}

function shortLocation(r: WhaleRecord): string {
  const parts: string[] = [];
  if (r.locationLabel && r.locationLabel !== "Unknown location") {
    parts.push(r.locationLabel);
  }
  if (r.county) parts.push(`${r.county} County`);
  return parts.join(" · ");
}

function keyFindings(r: WhaleRecord): string {
  const bits: string[] = [];
  if (r.boatCollision === "Y") bits.push("Vessel strike");
  if (r.entangled === "Y" || r.fisheryInteraction === "Y")
    bits.push("Entanglement");
  if (r.conditionAtExam) bits.push(r.conditionAtExam);
  if (r.sex && r.sex !== "Unknown") {
    const age = r.ageClass && r.ageClass !== "Unknown" ? r.ageClass.toLowerCase() : null;
    bits.push(age ? `${r.sex} ${age}` : r.sex);
  }
  return bits.join(" · ");
}

interface Props {
  record: WhaleRecord;
  onOpen: (record: WhaleRecord) => void;
  flashSpeciesColor?: string | null;
}

export default function StrandingCard({ record, onOpen, flashSpeciesColor }: Props) {
  const formatted = record.dateObserved
    ? new Date(record.dateObserved).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";
  const silhouette = SPECIES_SILHOUETTES[record.species] ?? null;
  const tint = getTint(record.species);

  return (
    <button
      type="button"
      className={`m-card ${flashSpeciesColor ? "m-card-flash" : ""}`}
      style={flashSpeciesColor ? { backgroundColor: flashSpeciesColor } : undefined}
      onClick={() => onOpen(record)}
    >
      <div className="m-card-silhouette" style={{ backgroundColor: tint }}>
        {silhouette && (
          <img
            src={silhouette}
            alt=""
            className={`m-card-silhouette-img${
              record.species === "Gray whale" ? " flip-h" : ""
            }`}
          />
        )}
      </div>
      <div className="m-card-body">
        <div className="m-card-species">{record.species}</div>
        <div className="m-card-date">{formatted}</div>
        {shortLocation(record) && (
          <div className="m-card-location">{shortLocation(record)}</div>
        )}
        {keyFindings(record) && (
          <div className="m-card-findings">{keyFindings(record)}</div>
        )}
      </div>
    </button>
  );
}
