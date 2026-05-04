import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { WhaleRecord } from "../../types/whale";
import { FEATURED_SPECIES, SPECIES_COLORS, OTHER_SPECIES_COLOR } from "../../types/whale";
import { getPinIcon } from "../../lib/whalePin";

const BAY_CENTER: [number, number] = [37.7, -122.3];
const BAY_ZOOM = 8;

interface Props {
  records: WhaleRecord[];
  onPinTap: (recordId: string) => void;
  onExpand: () => void;
  /** Show a subtle "Patterns ↓" affordance fading at the bottom of the
   *  map, signaling there's more below. Used as a first-visit hint;
   *  goes away after the user has interacted with the rail. */
  showPatternsAffordance?: boolean;
}

// Inner layer: adds pins imperatively the same way WhaleMap does,
// but without OMS (no spiderfy on the mini-map — tapping a pin
// bubbles up to the StrandingList, not to a detail popup).
function MiniMapPins({
  records,
  onPinTap,
}: {
  records: WhaleRecord[];
  onPinTap: (recordId: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const created: L.Marker[] = [];
    for (const record of records) {
      const marker = L.marker([record.latitude, record.longitude], {
        icon: getPinIcon(record.species, false, map.getZoom()),
      });
      marker.on("click", () => onPinTap(record.id));
      marker.addTo(map);
      created.push(marker);
    }
    return () => {
      for (const m of created) map.removeLayer(m);
    };
  }, [records, map, onPinTap]);

  return null;
}

function WaterLayer() {
  const [waterArea, setWaterArea] = useState<GeoJSON.FeatureCollection | null>(
    null
  );
  useEffect(() => {
    fetch("/water-area.json")
      .then((r) => r.json())
      .then(setWaterArea)
      .catch(() => {
        // Water layer is a nicety — if it fails, the basemap still shows.
      });
  }, []);
  if (!waterArea) return null;
  return (
    <GeoJSON
      data={waterArea}
      style={{
        fillColor: "#E8EFEF",
        fillOpacity: 1,
        stroke: false,
        interactive: false,
      }}
    />
  );
}

// Legend drawn inside the map: four colored dots + species labels.
function MiniLegend() {
  const entries: { label: string; color: string }[] = [
    { label: "Gray", color: SPECIES_COLORS["Gray whale"].pin },
    { label: "Humpback", color: SPECIES_COLORS["Humpback whale"].pin },
    { label: "Fin", color: SPECIES_COLORS["Fin whale"].pin },
    { label: "Other", color: OTHER_SPECIES_COLOR },
  ];
  void FEATURED_SPECIES;
  return (
    <div className="m-minimap-legend" aria-label="Species legend">
      {entries.map((e) => (
        <span key={e.label} className="m-minimap-legend-item">
          <span
            className="m-minimap-legend-dot"
            style={{ backgroundColor: e.color }}
            aria-hidden="true"
          />
          {e.label}
        </span>
      ))}
    </div>
  );
}

export default function MiniMap({
  records,
  onPinTap,
  onExpand,
  showPatternsAffordance,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="m-minimap" ref={containerRef}>
      <MapContainer
        center={BAY_CENTER}
        zoom={BAY_ZOOM}
        minZoom={7}
        maxZoom={14}
        className="m-minimap-leaflet"
        zoomControl={false}
        attributionControl={false}
        zoomAnimation={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <WaterLayer />
        <MiniMapPins records={records} onPinTap={onPinTap} />
      </MapContainer>
      <button
        type="button"
        className="m-minimap-expand"
        onClick={onExpand}
        aria-label="Open full-screen map"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
      <MiniLegend />
      {showPatternsAffordance && (
        // Subtle bottom-edge hint that there's a Patterns rail below.
        // Pulses gently while the nudge is active; the parent clears
        // it on first interaction.
        <div
          className="m-minimap-patterns-hint"
          aria-hidden="true"
        >
          Patterns <span className="m-minimap-patterns-hint-arrow">↓</span>
        </div>
      )}
    </div>
  );
}
