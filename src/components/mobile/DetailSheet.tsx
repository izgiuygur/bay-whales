import BottomSheet from "./BottomSheet";
import type { WhaleRecord, SpeciesKey } from "../../types/whale";
import { SPECIES_COLORS } from "../../types/whale";

// Duplicated (kept in sync with desktop InfoCard) — the desktop card is
// positioned absolute-floating on a map, whereas here we render the
// same content block inside a bottom sheet.
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

function getCardTint(species: string): string {
  if (species in SPECIES_COLORS) {
    return hexToRgba(SPECIES_COLORS[species as SpeciesKey].pin, 0.12);
  }
  return "rgba(0, 81, 186, 0.06)";
}

interface Props {
  record: WhaleRecord | null;
  onClose: () => void;
}

export default function DetailSheet({ record, onClose }: Props) {
  // Render the sheet only when a record is selected. BottomSheet
  // already handles mount/unmount animation on `open` changes.
  const open = record !== null;
  // Keep the last record around so content doesn't blank out during the
  // closing animation. Cheap enough; no memoization needed.

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      heights={[0.72, 1.0]}
      ariaLabel="Stranding details"
      header={
        <div className="m-detail-sheet-header">
          <span className="m-detail-sheet-title">Stranding</span>
          <button
            type="button"
            className="m-sheet-close"
            onClick={onClose}
            aria-label="Close details"
          >
            &times;
          </button>
        </div>
      }
    >
      {record && <DetailBody record={record} />}
    </BottomSheet>
  );
}

function DetailBody({ record }: { record: WhaleRecord }) {
  const formatted = record.dateObserved
    ? new Date(record.dateObserved).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";

  const sex =
    record.sex && record.sex !== "Unknown" ? record.sex : null;
  const age =
    record.ageClass && record.ageClass !== "Unknown"
      ? record.ageClass.toLowerCase()
      : null;
  const sexAge = [sex, age].filter(Boolean).join(", ");

  const findingsList: string[] = [];
  if (record.boatCollision === "Y") findingsList.push("Boat collision");
  if (record.fisheryInteraction === "Y")
    findingsList.push("Fishery interaction");
  if (record.entangled === "Y") findingsList.push("Entanglement");
  const reportedFindings =
    findingsList.length > 0
      ? findingsList
          .map((f, i) => (i === 0 ? f : f.toLowerCase()))
          .join(", ")
      : record.causeDetermination || null;

  const locationConfidence =
    record.coordQuality === "actual"
      ? "Exact"
      : record.coordQuality === "estimated"
        ? "Approximate"
        : record.coordQuality === "mixed"
          ? "Mixed"
          : "Unknown";

  const tint = getCardTint(record.species);
  const silhouette = SPECIES_SILHOUETTES[record.species] ?? null;

  return (
    <div className="m-detail">
      <div
        className="m-detail-illustration"
        style={{ backgroundColor: tint }}
      >
        {silhouette && (
          <div className="m-detail-silhouette-box">
            <img
              src={silhouette}
              alt={record.species}
              className={`m-detail-silhouette-img${
                record.species === "Gray whale" ? " flip-h" : ""
              }`}
            />
          </div>
        )}
      </div>

      <div className="m-detail-body">
        <div className="m-detail-header">
          <div className="m-detail-title">{record.species}</div>
          <div className="m-detail-subtitle">{formatted}</div>
        </div>

        {(record.locationLabel || record.county) && (
          <div className="m-detail-location">
            {record.locationLabel && (
              <div className="m-detail-location-label">
                {record.locationLabel}
              </div>
            )}
            {record.county && (
              <div className="m-detail-location-detail">
                {record.county} County
              </div>
            )}
          </div>
        )}

        <div className="m-detail-meta">
          {reportedFindings && (
            <div className="m-detail-meta-row">
              <span className="m-detail-meta-label">Reported findings:</span>{" "}
              <span className="m-detail-meta-value">
                {record.boatCollision === "Y" && (
                  <img
                    src="/boat-collision.png"
                    alt=""
                    className="m-detail-meta-icon"
                    aria-label="Boat collision recorded"
                  />
                )}
                {reportedFindings}
              </span>
            </div>
          )}
          {sexAge && (
            <div className="m-detail-meta-row">
              <span className="m-detail-meta-label">Sex / age:</span>{" "}
              <span className="m-detail-meta-value">{sexAge}</span>
            </div>
          )}
          <div className="m-detail-meta-row">
            <span className="m-detail-meta-label">Location confidence:</span>{" "}
            <span className="m-detail-meta-value">{locationConfidence}</span>
          </div>
          {record.fieldId && (
            <div className="m-detail-record-id">
              Record ID: <span>{record.fieldId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
