import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "../../lib/oms-setup";
import "overlapping-marker-spiderfier-leaflet";
import type { WhaleRecord } from "../../types/whale";
import { FEATURED_SPECIES, SPECIES_COLORS, OTHER_SPECIES_COLOR } from "../../types/whale";
import { SPECIES_COMMON, SPECIES_RARE } from "../../types/filters";
import { getPinIcon } from "../../lib/whalePin";
import BottomSheet from "./BottomSheet";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OverlappingMarkerSpiderfier = (window as any).OverlappingMarkerSpiderfier;

const BAY_CENTER: [number, number] = [37.7, -122.3];
const BAY_ZOOM = 9;

const OTHER_SPECIES: string[] = [
  ...SPECIES_COMMON.filter((s) => !FEATURED_SPECIES.includes(s as never)),
  ...SPECIES_RARE,
];

interface Props {
  open: boolean;
  onClose: () => void;
  records: WhaleRecord[];
  hiddenSpecies: Set<string>;
  onToggleSpecies: (species: string) => void;
  onToggleGroup: (group: string[], makeHidden: boolean) => void;
  onPinTap: (record: WhaleRecord) => void;
  // Layers
  showBathymetry: boolean;
  onToggleBathymetry: () => void;
  showShippingLanes: boolean;
  onToggleShippingLanes: () => void;
  showPre2013Lanes: boolean;
  onTogglePre2013Lanes: () => void;
}

// Marker layer using OMS. Separate instance from the desktop/mini map.
function ExpandedMarkers({
  records,
  onPinTap,
}: {
  records: WhaleRecord[];
  onPinTap: (record: WhaleRecord) => void;
}) {
  const map = useMap();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const omsRef = useRef<any | null>(null);
  const onPinRef = useRef(onPinTap);
  onPinRef.current = onPinTap;

  useEffect(() => {
    const oms = new OverlappingMarkerSpiderfier(map, {
      keepSpiderfied: true,
      nearbyDistance: 20,
      circleSpiralSwitchover: 9,
      legWeight: 1.5,
      legColors: {
        usual: "rgba(156, 163, 175, 0.6)",
        highlighted: "rgba(17, 17, 17, 0.8)",
      },
    });
    oms.addListener("click", (m: unknown) => {
      const marker = m as L.Marker;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const record = (marker as any).__whaleRecord as WhaleRecord | undefined;
      if (!record) return;
      onPinRef.current(record);
    });
    omsRef.current = oms;
    return () => {
      oms.clearMarkers();
      oms.clearListeners("click");
      omsRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const oms = omsRef.current;
    if (!oms) return;
    const created: L.Marker[] = [];
    for (const record of records) {
      const marker = L.marker([record.latitude, record.longitude], {
        icon: getPinIcon(record.species, false, map.getZoom()),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (marker as any).__whaleRecord = record;
      marker.addTo(map);
      oms.addMarker(marker);
      created.push(marker);
    }
    return () => {
      for (const m of created) {
        map.removeLayer(m);
        oms.removeMarker(m);
      }
    };
  }, [records, map]);

  return null;
}

function WaterLayer() {
  const [waterArea, setWaterArea] = useState<GeoJSON.FeatureCollection | null>(null);
  useEffect(() => {
    fetch("/water-area.json")
      .then((r) => r.json())
      .then(setWaterArea)
      .catch(() => {});
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

function PillRow({
  hidden,
  onToggleSpecies,
  onToggleGroup,
}: {
  hidden: Set<string>;
  onToggleSpecies: (species: string) => void;
  onToggleGroup: (group: string[], makeHidden: boolean) => void;
}) {
  interface Pill {
    key: string;
    label: string;
    color: string;
    dotColor: string;
    isActive: boolean;
    onToggle: () => void;
  }
  const pills: Pill[] = FEATURED_SPECIES.map((species) => {
    const colors = SPECIES_COLORS[species];
    const isActive = !hidden.has(species);
    return {
      key: species,
      label: species.replace(" whale", ""),
      color: colors.active,
      dotColor: colors.pin,
      isActive,
      onToggle: () => onToggleSpecies(species),
    };
  });
  const anyOtherVisible = OTHER_SPECIES.some((s) => !hidden.has(s));
  pills.push({
    key: "__other__",
    label: "Other",
    color: OTHER_SPECIES_COLOR,
    dotColor: OTHER_SPECIES_COLOR,
    isActive: anyOtherVisible,
    onToggle: () => onToggleGroup(OTHER_SPECIES, anyOtherVisible),
  });
  return (
    <div className="m-expanded-pills">
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`species-pill ${p.isActive ? "active" : ""}`}
          style={{
            backgroundColor: p.isActive ? p.color : "#fff",
            borderColor: p.color,
            color: p.isActive ? "#fff" : "#333",
          }}
          onClick={p.onToggle}
          aria-pressed={p.isActive}
          aria-label={p.isActive ? `Hide ${p.label}` : `Show ${p.label}`}
        >
          <span
            className="species-pill-dot"
            style={{
              backgroundColor: p.dotColor,
              visibility: p.isActive ? "hidden" : "visible",
            }}
            aria-hidden="true"
          />
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function ExpandedMapModal(props: Props) {
  const {
    open,
    onClose,
    records,
    hiddenSpecies,
    onToggleSpecies,
    onToggleGroup,
    onPinTap,
    showBathymetry,
    onToggleBathymetry,
    showShippingLanes,
    onToggleShippingLanes,
    showPre2013Lanes,
    onTogglePre2013Lanes,
  } = props;

  const [layersSheetOpen, setLayersSheetOpen] = useState(false);

  // Escape to close the modal (layers sheet handles its own Escape).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !layersSheetOpen) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, layersSheetOpen]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handlePinTap = useCallback(
    (record: WhaleRecord) => {
      onPinTap(record);
    },
    [onPinTap]
  );

  if (!open) return null;

  return createPortal(
    <div
      className="m-expanded-root"
      role="dialog"
      aria-modal="true"
      aria-label="Map"
    >
      <div className="m-expanded-topbar">
        <button
          type="button"
          className="m-expanded-close"
          onClick={onClose}
          aria-label="Close map"
        >
          &times;
        </button>
        <PillRow
          hidden={hiddenSpecies}
          onToggleSpecies={onToggleSpecies}
          onToggleGroup={onToggleGroup}
        />
      </div>

      <MapContainer
        center={BAY_CENTER}
        zoom={BAY_ZOOM}
        minZoom={7}
        maxZoom={18}
        className="m-expanded-leaflet"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <WaterLayer />
        <ExpandedMarkers records={records} onPinTap={handlePinTap} />
      </MapContainer>

      <button
        type="button"
        className="m-expanded-layers-btn"
        onClick={() => setLayersSheetOpen(true)}
        aria-label="Map layers"
      >
        Layers
      </button>

      <BottomSheet
        open={layersSheetOpen}
        onClose={() => setLayersSheetOpen(false)}
        heights={[0.42]}
        ariaLabel="Map layers"
        header={
          <div className="m-filter-sheet-header">
            <span aria-hidden="true" />
            <span className="m-filter-sheet-title">Map layers</span>
            <button
              type="button"
              className="m-sheet-close"
              onClick={() => setLayersSheetOpen(false)}
              aria-label="Close layers"
            >
              &times;
            </button>
          </div>
        }
      >
        <div className="m-filter-layers">
          <LayerRow
            label="Bathymetry"
            on={showBathymetry}
            onToggle={onToggleBathymetry}
          />
          <LayerRow
            label="Shipping lanes"
            on={showShippingLanes}
            onToggle={onToggleShippingLanes}
          />
          <LayerRow
            label="Shipping lanes (pre-2013)"
            on={showPre2013Lanes}
            onToggle={onTogglePre2013Lanes}
          />
        </div>
      </BottomSheet>
    </div>,
    document.body
  );
}

function LayerRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="m-layer-row">
      <span className="m-layer-label">{label}</span>
      <button
        type="button"
        className={`layer-switch ${on ? "on" : ""}`}
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        aria-label={label}
      >
        <span className="layer-switch-thumb" aria-hidden="true" />
        <span className="layer-switch-text" aria-hidden="true">
          {on ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );
}
