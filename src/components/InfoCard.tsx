import { useRef, useLayoutEffect, useState } from "react";
import type { WhaleRecord, SpeciesKey } from "../types/whale";
import { SPECIES_COLORS } from "../types/whale";

interface Props {
  record: WhaleRecord;
  position: { x: number; y: number };
  onClose: () => void;
}

const CARD_W = 332;
const GAP = 12;

// Convert hex to rgba with given alpha
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCardTint(species: string): string {
  if (species in SPECIES_COLORS) {
    const pin = SPECIES_COLORS[species as SpeciesKey].pin;
    return hexToRgba(pin, 0.12);
  }
  return "rgba(0, 81, 186, 0.06)";
}

// Silhouette PNGs mapped by normalized species name.
// Unidentified categories reuse a visually similar species illustration.
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
  // Unidentified categories reuse existing illustrations
  "Unidentified fin/sei whale": "/whale_silhouettes/fin-whale.png",
  "Unidentified baleen whale": "/whale_silhouettes/minke-whale.png",
  "Unidentified whale": "/whale_silhouettes/fin-whale.png",
};

export default function InfoCard({ record, position, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    const card = cardRef.current;
    const container = card?.parentElement;
    if (!card || !container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    // Measure the actual rendered card size so variable-length content
    // is placed correctly (the card height changes based on content).
    const cardH = card.offsetHeight;
    const cardW = card.offsetWidth || CARD_W;

    // Try to place to the right of the point
    let left = position.x + GAP;
    let top = position.y - cardH / 2;

    // If it overflows right, place to the left
    if (left + cardW > cw) {
      left = position.x - cardW - GAP;
    }

    // Clamp vertically
    if (top < GAP) top = GAP;
    if (top + cardH > ch - GAP) top = ch - GAP - cardH;

    setStyle({ left, top, visibility: "visible" });
  }, [position, record.id]);

  const formatted = record.dateObserved
    ? new Date(record.dateObserved).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";

  // Sex / age: "Female, adult" — sex title-cased, age lowercased
  const sex =
    record.sex && record.sex !== "Unknown" ? record.sex : null;
  const age =
    record.ageClass && record.ageClass !== "Unknown"
      ? record.ageClass.toLowerCase()
      : null;
  const sexAge = [sex, age].filter(Boolean).join(", ");

  // Reported findings from Y/N interaction flags; fall back to
  // causeDetermination if no specific flags are set.
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
    <div
      className="info-card"
      ref={cardRef}
      style={{ ...style, ["--card-tint" as string]: tint } as React.CSSProperties}
    >
      <button
        className="info-card-close"
        onClick={onClose}
        aria-label="Close details"
        type="button"
      >
        &times;
      </button>

      <div className="info-card-illustration">
        {silhouette && (
          <div className="info-card-silhouette-box">
            <img
              src={silhouette}
              alt={record.species}
              className={`info-card-silhouette-img${
                record.species === "Gray whale" ? " flip-h" : ""
              }`}
            />
          </div>
        )}
      </div>

      <div className="info-card-body">
        <div className="info-card-header">
          <div className="info-card-title">{record.species}</div>
          <div className="info-card-subtitle">{formatted}</div>
        </div>

        <div className="info-card-bottom">
          {(record.locationLabel || record.county) && (
            <div className="info-card-location">
              {record.locationLabel && (
                <div className="info-card-location-label">
                  {record.locationLabel}
                </div>
              )}
              {record.county && (
                <div className="info-card-location-detail">
                  {record.county} County
                </div>
              )}
            </div>
          )}

          <div className="info-card-meta">
            {reportedFindings && (
              <div className="info-card-meta-row info-card-meta-row-findings">
                <span className="info-card-meta-label">Reported findings:</span>{" "}
                <span className="info-card-meta-value">
                  {record.boatCollision === "Y" && (
                    <img
                      src="/boat-collision.png"
                      alt=""
                      className="info-card-meta-icon"
                      aria-label="Boat collision recorded"
                    />
                  )}
                  {reportedFindings}
                </span>
              </div>
            )}
            {sexAge && (
              <div className="info-card-meta-row">
                <span className="info-card-meta-label">Sex / age:</span>{" "}
                <span className="info-card-meta-value">{sexAge}</span>
              </div>
            )}
            <div className="info-card-meta-row">
              <span className="info-card-meta-label">Location confidence:</span>{" "}
              <span className="info-card-meta-value">{locationConfidence}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
