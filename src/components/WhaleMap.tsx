import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
// OMS is a legacy window-global plugin: it reads `window.L` at load
// time and attaches itself as `window.OverlappingMarkerSpiderfier`.
// The setup module below exposes Leaflet on window BEFORE the plugin
// module evaluates — import order is load order.
import "../lib/oms-setup";
import "overlapping-marker-spiderfier-leaflet";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OverlappingMarkerSpiderfier = (window as any).OverlappingMarkerSpiderfier;
import type { LeafletMouseEvent } from "leaflet";
import type { WhaleRecord } from "../types/whale";
import { SPECIES_COLORS } from "../types/whale";
import type { SpeciesKey } from "../types/whale";
import MapTooltip from "./MapTooltip";
import InfoCard from "./InfoCard";

interface Props {
  records: WhaleRecord[];
  showBathymetry: boolean;
  showShippingLanes: boolean;
  showPre2013Lanes: boolean;
}

const BAY_CENTER: [number, number] = [37.7, -122.3];
const BAY_ZOOM = 9;
const MAX_BOUNDS: L.LatLngBoundsExpression = [
  [36.5, -124.2],
  [39.4, -121.3],
];

// Fallback styling for rare / non-featured species: dark gray pin + tooltip
// with white text for contrast.
const FALLBACK_DARK = "#4a4a4a";

function getMarkerColor(species: string): string {
  if (species in SPECIES_COLORS) {
    return SPECIES_COLORS[species as SpeciesKey].pin;
  }
  return FALLBACK_DARK;
}

export function getTooltipFg(species: string): string {
  if (species in SPECIES_COLORS) {
    return "#333";
  }
  return "#ffffff";
}

function speciesSlug(species: string): string {
  return species
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "other";
}

export function getTooltipBg(species: string): string {
  if (species in SPECIES_COLORS) {
    return SPECIES_COLORS[species as SpeciesKey].passive;
  }
  return FALLBACK_DARK;
}

// Teardrop pin width (px) at a given zoom level. Each value was
// shrunk by ~15% vs the original ladder (24/18/14/11/8) so the
// default view feels less crowded.
function pinSizeForZoom(zoom: number): number {
  if (zoom >= 13) return 20;
  if (zoom >= 11) return 15;
  if (zoom >= 10) return 12;
  if (zoom >= 9) return 9;
  return 7;
}

function createPinIcon(
  color: string,
  size: number,
  species: string
): L.DivIcon {
  const h = Math.round(size * 1.3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 24 31">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 19 12 19s12-10 12-19C24 5.4 18.6 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="11" r="4.5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: `whale-pin whale-pin--${speciesSlug(species)}`,
    iconSize: [size, h],
    iconAnchor: [size / 2, h],
  });
}

function createSelectedPinIcon(zoom: number): L.DivIcon {
  const size = Math.round(pinSizeForZoom(zoom) * 1.4);
  const h = Math.round(size * 1.3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 24 31">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 19 12 19s12-10 12-19C24 5.4 18.6 0 12 0z" fill="#111"/>
    <circle cx="12" cy="11" r="4.5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "whale-pin selected",
    iconSize: [size, h],
    iconAnchor: [size / 2, h],
  });
}

const iconCache = new Map<string, L.DivIcon>();

function getPinIcon(species: string, isSelected: boolean, zoom: number): L.DivIcon {
  if (isSelected) return createSelectedPinIcon(zoom);
  const size = pinSizeForZoom(zoom);
  const key = `${species}-${size}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, createPinIcon(getMarkerColor(species), size, species));
  }
  return iconCache.get(key)!;
}

function ZoomHandler({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
    click: () => {},
  });
  return null;
}

const BAY_AREA_LABELS: { name: string; lat: number; lng: number; type: "city" | "county"; minZoom?: number }[] = [
  // Counties
  { name: "MARIN", lat: 38.05, lng: -122.75, type: "county" },
  { name: "SONOMA", lat: 38.35, lng: -122.7, type: "county", minZoom: 9 },
  { name: "SAN FRANCISCO", lat: 37.78, lng: -122.42, type: "county" },
  { name: "SAN MATEO", lat: 37.5, lng: -122.33, type: "county" },
  { name: "SANTA CRUZ", lat: 37.0, lng: -122.05, type: "county", minZoom: 9 },
  { name: "ALAMEDA", lat: 37.72, lng: -122.1, type: "county", minZoom: 9 },
  { name: "CONTRA COSTA", lat: 37.92, lng: -122.08, type: "county", minZoom: 9 },
  { name: "SOLANO", lat: 38.25, lng: -122.05, type: "county", minZoom: 9 },
  // Cities
  { name: "San Francisco", lat: 37.76, lng: -122.44, type: "city", minZoom: 10 },
  { name: "Oakland", lat: 37.805, lng: -122.27, type: "city", minZoom: 10 },
  { name: "Berkeley", lat: 37.875, lng: -122.27, type: "city", minZoom: 10 },
  { name: "Richmond", lat: 37.935, lng: -122.35, type: "city", minZoom: 10 },
  { name: "Daly City", lat: 37.688, lng: -122.47, type: "city", minZoom: 10 },
  { name: "Half Moon Bay", lat: 37.464, lng: -122.43, type: "city", minZoom: 10 },
  { name: "Pacifica", lat: 37.613, lng: -122.487, type: "city", minZoom: 10 },
  { name: "Sausalito", lat: 37.859, lng: -122.485, type: "city", minZoom: 10 },
  { name: "Stinson Beach", lat: 37.9, lng: -122.635, type: "city", minZoom: 10 },
  { name: "Bolinas", lat: 37.91, lng: -122.686, type: "city", minZoom: 10 },
  { name: "Point Reyes Station", lat: 38.07, lng: -122.81, type: "city", minZoom: 10 },
  { name: "Novato", lat: 38.1, lng: -122.57, type: "city", minZoom: 10 },
  { name: "Hayward", lat: 37.67, lng: -122.08, type: "city", minZoom: 10 },
  { name: "Fremont", lat: 37.55, lng: -121.98, type: "city", minZoom: 10 },
  { name: "Santa Cruz", lat: 36.974, lng: -122.03, type: "city", minZoom: 10 },
  { name: "Vallejo", lat: 38.105, lng: -122.26, type: "city", minZoom: 10 },
  { name: "San Rafael", lat: 37.975, lng: -122.53, type: "city", minZoom: 10 },
  { name: "South San Francisco", lat: 37.655, lng: -122.41, type: "city", minZoom: 11 },
  { name: "San Mateo", lat: 37.56, lng: -122.32, type: "city", minZoom: 11 },
  { name: "Bodega Bay", lat: 38.335, lng: -123.05, type: "city", minZoom: 10 },
  { name: "Tomales Bay", lat: 38.18, lng: -122.92, type: "city", minZoom: 10 },
  { name: "Inverness", lat: 38.1, lng: -122.86, type: "city", minZoom: 11 },
  { name: "Mountain View", lat: 37.39, lng: -122.08, type: "city", minZoom: 11 },
];

function BayAreaLabels({ zoom }: { zoom: number }) {
  const map = useMap();

  useEffect(() => {
    const labels: L.Marker[] = [];

    BAY_AREA_LABELS.forEach((label) => {
      const minZoom = label.minZoom ?? 8;
      if (zoom < minZoom) return;

      const isCounty = label.type === "county";
      const icon = L.divIcon({
        html: `<span class="map-label ${isCounty ? "map-label-county" : "map-label-city"}">${label.name}</span>`,
        className: "map-label-wrapper",
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([label.lat, label.lng], {
        icon,
        interactive: false,
      }).addTo(map);
      labels.push(marker);
    });

    return () => {
      labels.forEach((m) => map.removeLayer(m));
    };
  }, [map, zoom]);

  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
}

// NOAA ENC DEPARE depth bands — monochromatic blue-gray
// Fills: gentle tonal ramp; outer bands fade to avoid hard coverage edge
const BAND_FILL_OPACITY: Record<number, number> = {
  1: 0.05,   // 0-10m   (near-shore)
  2: 0.08,   // 10-20m
  3: 0.10,   // 20-50m
  4: 0.12,   // 50-100m
  5: 0.13,   // 100-200m
  6: 0.10,   // 200-500m  (fade out toward edge)
  7: 0.06,   // 500-1000m (very faint — coverage edge)
};

function bathyFillStyle(feature: any): L.PathOptions {
  const band = feature?.properties?.band ?? 1;
  return {
    fillColor: "#7a8fa3",
    fillOpacity: BAND_FILL_OPACITY[band] ?? 0.04,
    stroke: false,
    interactive: false,
  };
}

// Always-on flat blue fill over all bathymetry polygons so the
// water area reads as a soft blue while land (light_nolabels tiles)
// stays white. Every band renders with solid opacity; since the
// polygons nest, the union is the full water extent.
function waterFillStyle(): L.PathOptions {
  return {
    fillColor: "#E8EFEF",
    fillOpacity: 1,
    stroke: false,
    interactive: false,
  };
}

function bathyContourStyle(feature: any): L.PathOptions {
  const band = feature?.properties?.band ?? 1;
  // Shallow contours slightly more visible; deep ones fade
  const opacity = band <= 4 ? 0.10 : band <= 6 ? 0.07 : 0.04;
  return {
    fill: false,
    stroke: true,
    color: "#7a8fa3",
    weight: 0.5,
    opacity,
    interactive: false,
  };
}

// Shipping lanes — quiet, understated overlay
function shippingLaneStyle(): L.PathOptions {
  return {
    fillColor: "#8b7cb8",
    fillOpacity: 0.06,
    stroke: true,
    color: "#8b7cb8",
    weight: 0.5,
    opacity: 0.15,
    interactive: false,
  };
}

// Coastline
const COASTLINE_STYLE: L.PathOptions = {
  fill: false,
  stroke: true,
  color: "#111",
  weight: 0.8,
  opacity: 0.2,
  interactive: false,
};

// Pre-2013 shipping lanes
function pre2013LaneStyle(feature: any): L.PathOptions {
  const cat = feature?.properties?.category ?? "lane";
  if (cat === "separation") {
    return {
      fillColor: "#b0926a",
      fillOpacity: 0.05,
      stroke: true,
      color: "#b0926a",
      weight: 0.4,
      opacity: 0.12,
      dashArray: "4 3",
      interactive: false,
    };
  }
  if (cat === "precautionary") {
    return {
      fillColor: "#b0926a",
      fillOpacity: 0.04,
      stroke: true,
      color: "#b0926a",
      weight: 0.5,
      opacity: 0.12,
      interactive: false,
    };
  }
  if (cat === "separation_line") {
    return {
      fill: false,
      stroke: true,
      color: "#b0926a",
      weight: 0.5,
      opacity: 0.15,
      dashArray: "4 3",
      interactive: false,
    };
  }
  // lanes
  return {
    fillColor: "#b0926a",
    fillOpacity: 0.06,
    stroke: true,
    color: "#b0926a",
    weight: 0.5,
    opacity: 0.15,
    interactive: false,
  };
}

interface MarkerLayerProps {
  records: WhaleRecord[];
  selectedId: string | null;
  zoom: number;
  onMouseOver: (record: WhaleRecord, e: LeafletMouseEvent) => void;
  onMouseOut: () => void;
  onClick: (record: WhaleRecord, e: LeafletMouseEvent) => void;
}

// Renders one native Leaflet marker per record and wires them into an
// OverlappingMarkerSpiderfier so stacked pins (Angel Island, SF waterfront,
// Point Reyes beaches) fan out on click instead of being unclickable.
//
// We drop react-leaflet's <Marker> component here because OMS needs
// direct access to the marker instances, and re-rendering React children
// interferes with its internal tracking. Instead we rebuild the layer
// imperatively whenever records / selectedId / zoom change.
function WhaleMarkerLayer({
  records,
  selectedId,
  zoom,
  onMouseOver,
  onMouseOut,
  onClick,
}: MarkerLayerProps) {
  const map = useMap();
  // Stable OMS instance across re-renders — created once per map.
  // OMS has no bundled types; we use the imperative methods directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const omsRef = useRef<any | null>(null);
  // Keep latest click handler without re-creating OMS when it changes.
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  // Create OMS once when the map mounts.
  useEffect(() => {
    const oms = new OverlappingMarkerSpiderfier(map, {
      keepSpiderfied: true, // stay fanned out until user clicks elsewhere
      nearbyDistance: 20, // px — pins within 20px count as overlapping
      circleSpiralSwitchover: 9, // circle for ≤9, spiral for more
      legWeight: 1.5,
      legColors: {
        usual: "rgba(156, 163, 175, 0.6)",
        highlighted: "rgba(17, 17, 17, 0.8)",
      },
    });
    // Spiderfier intercepts click events — look up the record via the
    // marker's attached WhaleRecord reference (set when we create it).
    // OMS doesn't give us the original MouseEvent, so we derive screen
    // coords from the (possibly just-spiderfied) marker's DOM position
    // to keep the detail card anchored correctly.
    oms.addListener("click", (m: unknown) => {
      const marker = m as L.Marker;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const record = (marker as any).__whaleRecord as WhaleRecord | undefined;
      if (!record) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const iconEl = (marker as any)._icon as HTMLElement | undefined;
      let clientX = 0;
      let clientY = 0;
      if (iconEl) {
        const r = iconEl.getBoundingClientRect();
        clientX = r.left + r.width / 2;
        clientY = r.top + r.height / 2;
      }
      const evt = {
        target: marker,
        latlng: marker.getLatLng(),
        originalEvent: { clientX, clientY },
      } as unknown as LeafletMouseEvent;
      onClickRef.current(record, evt);
    });
    omsRef.current = oms;
    return () => {
      oms.clearMarkers();
      oms.clearListeners("click");
      omsRef.current = null;
    };
  }, [map]);

  // Re-render markers whenever records, selection, or zoom changes.
  useEffect(() => {
    const oms = omsRef.current;
    if (!oms) return;

    // Remove any previously-added markers from both OMS and the map.
    const existing = oms.getMarkers();
    for (const m of existing) map.removeLayer(m);
    oms.clearMarkers();

    for (const record of records) {
      const isSelected = selectedId === record.id;
      const marker = L.marker([record.latitude, record.longitude], {
        icon: getPinIcon(record.species, isSelected, zoom),
      });
      // Attach the record so the OMS click handler can look it up.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (marker as any).__whaleRecord = record;
      // Hover events stay on the marker directly (OMS only intercepts
      // clicks). This keeps the tooltip behavior intact.
      marker.on("mouseover", (e) =>
        onMouseOver(record, e as LeafletMouseEvent)
      );
      marker.on("mouseout", onMouseOut);
      marker.addTo(map);
      oms.addMarker(marker);
    }

    return () => {
      // Remove just the markers we added on this pass.
      const current = oms.getMarkers();
      for (const m of current) map.removeLayer(m);
      oms.clearMarkers();
    };
  }, [records, selectedId, zoom, map, onMouseOver, onMouseOut]);

  return null;
}

export default function WhaleMap({ records, showBathymetry, showShippingLanes, showPre2013Lanes }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPos, setSelectedPos] = useState({ x: 0, y: 0 });
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(BAY_ZOOM);
  const [bathymetry, setBathymetry] = useState<any>(null);
  const [shippingLanes, setShippingLanes] = useState<any>(null);
  const [pre2013Lanes, setPre2013Lanes] = useState<any>(null);
  const [coastline, setCoastline] = useState<any>(null);
  const [waterArea, setWaterArea] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerClickedRef = useRef(false);

  useEffect(() => {
    fetch("/bathymetry-bands.json")
      .then((r) => r.json())
      .then(setBathymetry);
    fetch("/shipping-lanes.json")
      .then((r) => r.json())
      .then(setShippingLanes);
    fetch("/shipping-lanes-pre2013.json")
      .then((r) => r.json())
      .then(setPre2013Lanes);
    fetch("/coastline.json")
      .then((r) => r.json())
      .then(setCoastline);
    fetch("/water-area.json")
      .then((r) => r.json())
      .then(setWaterArea);
  }, []);

  const bathyFills = useMemo(() => {
    if (!bathymetry) return null;
    return {
      type: "FeatureCollection" as const,
      features: bathymetry.features.filter((f: any) => f.properties.kind === "fill"),
    };
  }, [bathymetry]);

  const bathyContours = useMemo(() => {
    if (!bathymetry) return null;
    return {
      type: "FeatureCollection" as const,
      features: bathymetry.features.filter((f: any) => f.properties.kind === "contour"),
    };
  }, [bathymetry]);

  const hoveredRecord = records.find((r) => r.id === hoveredId);
  const selectedRecord = records.find((r) => r.id === selectedId);

  const handleMouseOver = useCallback(
    (record: WhaleRecord, e: LeafletMouseEvent) => {
      if (selectedId === record.id) return;
      setHoveredId(record.id);
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        // Anchor to the pin's actual DOM position (top-right corner of the
        // icon), not the cursor position — so the tooltip always appears in
        // the same spot relative to every pin, regardless of where on the
        // pin the user is hovering.
        const iconEl = (e.target as L.Marker & { _icon?: HTMLElement })._icon;
        if (iconEl) {
          const pinRect = iconEl.getBoundingClientRect();
          setTooltipPos({
            x: pinRect.right - containerRect.left,
            y: pinRect.top - containerRect.top,
          });
        } else {
          setTooltipPos({
            x: e.originalEvent.clientX - containerRect.left,
            y: e.originalEvent.clientY - containerRect.top,
          });
        }
      }
    },
    [selectedId]
  );

  const handleMouseOut = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleClick = useCallback((record: WhaleRecord, e: LeafletMouseEvent) => {
    markerClickedRef.current = true;
    setSelectedId((prev) => (prev === record.id ? null : record.id));
    setHoveredId(null);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSelectedPos({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
      });
    }
  }, []);

  const handleMapClick = useCallback(() => {
    if (markerClickedRef.current) {
      markerClickedRef.current = false;
      return;
    }
    setSelectedId(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="map-container" ref={containerRef}>
      <MapContainer
        center={BAY_CENTER}
        zoom={BAY_ZOOM}
        minZoom={8}
        maxZoom={18}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={0.8}
        className="leaflet-map"
        zoomControl={false}
        attributionControl={false}
      >
        {waterArea && (
          <>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <GeoJSON
              key="water-fill"
              data={waterArea}
              style={waterFillStyle}
            />
          </>
        )}
        {coastline && (
          <GeoJSON data={coastline} style={() => COASTLINE_STYLE} />
        )}
        {bathyFills && showBathymetry && (
          <GeoJSON data={bathyFills} style={bathyFillStyle} />
        )}
        {bathyContours && showBathymetry && zoom >= 10 && (
          <GeoJSON key={`contours-${zoom >= 10}`} data={bathyContours} style={bathyContourStyle} />
        )}
        {shippingLanes && showShippingLanes && (
          <GeoJSON key="shipping-lanes" data={shippingLanes} style={shippingLaneStyle} />
        )}
        {pre2013Lanes && showPre2013Lanes && (
          <GeoJSON key="pre2013-lanes" data={pre2013Lanes} style={pre2013LaneStyle} />
        )}
        <ZoomHandler onZoom={setZoom} />
        <BayAreaLabels zoom={zoom} />
        <MapClickHandler onMapClick={handleMapClick} />
        <WhaleMarkerLayer
          records={records}
          selectedId={selectedId}
          zoom={zoom}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          onClick={handleClick}
        />
      </MapContainer>

      {hoveredRecord && !selectedRecord && (
        <MapTooltip
          record={hoveredRecord}
          position={tooltipPos}
          bgColor={getTooltipBg(hoveredRecord.species)}
          fgColor={getTooltipFg(hoveredRecord.species)}
        />
      )}

      {selectedRecord && (
        <InfoCard
          record={selectedRecord}
          position={selectedPos}
          onClose={() => setSelectedId(null)}
        />
      )}

      <div className="map-attribution">
        Basemap{" "}
        <a
          href="https://carto.com/attributions"
          target="_blank"
          rel="noopener noreferrer"
        >
          © CARTO
        </a>
        {" · "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          © OpenStreetMap contributors
        </a>
        {" · "}Data: NOAA Fisheries, The Marine Mammal Center, California
        Academy of Sciences
      </div>
    </div>
  );
}
