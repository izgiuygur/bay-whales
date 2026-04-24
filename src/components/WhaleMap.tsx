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
// Pin rendering helpers live in `lib/whalePin` so the mobile mini-map
// can reuse the exact same geometry + palette.
import {
  PIN_FALLBACK_COLOR as FALLBACK_DARK,
  getPinIcon,
} from "../lib/whalePin";
import MapTooltip from "./MapTooltip";
import InfoCard from "./InfoCard";

interface Props {
  records: WhaleRecord[];
  showBathymetry: boolean;
  showShippingLanes: boolean;
  showPre2013Lanes: boolean;
  /** Initial center + zoom (from the shared URL, if any). */
  initialView?: { lat: number; lng: number; zoom: number } | null;
  /** Source record id of a stranding whose detail card should open on mount. */
  initialPinId?: string | null;
  /** Ref populated with the Leaflet map instance once it's mounted. */
  mapRef?: React.MutableRefObject<L.Map | null>;
}

const BAY_CENTER: [number, number] = [37.7, -122.3];
const BAY_ZOOM = 9;
const MAX_BOUNDS: L.LatLngBoundsExpression = [
  [36.5, -124.2],
  [39.4, -121.3],
];

export function getTooltipFg(species: string): string {
  if (species in SPECIES_COLORS) {
    return "#333";
  }
  return "#ffffff";
}

export function getTooltipBg(species: string): string {
  if (species in SPECIES_COLORS) {
    return SPECIES_COLORS[species as SpeciesKey].passive;
  }
  return FALLBACK_DARK;
}

function ZoomHandler({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
    click: () => {},
  });
  return null;
}

// Forwards the Leaflet map instance to an external ref. The ref is
// only ever read (never written during normal use) — the Share button
// queries it at click time to snapshot the current view.
function MapRefBridge({
  mapRef,
}: {
  mapRef?: React.MutableRefObject<L.Map | null>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!mapRef) return;
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);
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

// Build a screen-reader-friendly label for a single pin.
// Format: "Gray whale, January 8 2015, Abbotts Lagoon, Marin County"
// Commas give natural pauses for most screen readers. Falls back
// gracefully when some fields are missing.
function buildPinAriaLabel(record: WhaleRecord): string {
  const parts: string[] = [record.species];

  if (record.dateObserved) {
    const d = new Date(record.dateObserved);
    if (!isNaN(d.getTime())) {
      parts.push(
        d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      );
    }
  }

  if (record.locationLabel && record.locationLabel !== "Unknown location") {
    parts.push(record.locationLabel);
  } else if (record.county) {
    parts.push(`${record.county} County`);
  }

  return parts.join(", ");
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

    // Track every marker we add this pass in a local array — that's
    // the authoritative list for cleanup. Relying on `oms.getMarkers()`
    // inside the cleanup can leak markers when OMS's internal state
    // drifts (e.g. across StrictMode's mount/unmount/mount cycle or
    // when overlapping effect cleanups run out of order).
    const created: L.Marker[] = [];

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
      // Give the marker an accessible name so screen readers announce
      // which record each focused pin represents (species, date,
      // location). We set aria-label directly on the DOM element
      // instead of using marker.options.title, to avoid the native
      // browser tooltip delay interfering with our custom MapTooltip.
      const el = marker.getElement();
      if (el) {
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", buildPinAriaLabel(record));
      }
      oms.addMarker(marker);
      created.push(marker);
    }

    return () => {
      // Remove exactly the markers we created in this pass.
      for (const m of created) {
        map.removeLayer(m);
        oms.removeMarker(m);
      }
    };
  }, [records, selectedId, zoom, map, onMouseOver, onMouseOut]);

  return null;
}

export default function WhaleMap({
  records,
  showBathymetry,
  showShippingLanes,
  showPre2013Lanes,
  initialView,
  initialPinId,
  mapRef,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPos, setSelectedPos] = useState({ x: 0, y: 0 });
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialView ? Math.round(initialView.zoom) : BAY_ZOOM);
  // Only apply the pin param once — after that, normal user clicks drive selection.
  const didApplyInitialPin = useRef(false);
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

  // Compute initial center / zoom ONCE, so later URL-free pans don't retrigger.
  const initialCenter = useMemo<[number, number]>(
    () => (initialView ? [initialView.lat, initialView.lng] : BAY_CENTER),
    // initialView only applies on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const initialZoom = useMemo<number>(
    () => (initialView ? initialView.zoom : BAY_ZOOM),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Apply the initial pin from the URL once records are loaded. If the
  // pin doesn't resolve to a real record, we silently skip it.
  useEffect(() => {
    if (didApplyInitialPin.current) return;
    if (!initialPinId) return;
    if (records.length === 0) return;
    const found = records.find((r) => r.id === initialPinId);
    if (!found) {
      didApplyInitialPin.current = true;
      return;
    }
    didApplyInitialPin.current = true;
    // Defer so the map has a chance to render pins + layout a bit before
    // we compute the card's on-screen anchor.
    setTimeout(() => {
      setSelectedId(found.id);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSelectedPos({ x: rect.width * 0.5, y: rect.height * 0.5 });
      }
    }, 250);
  }, [records, initialPinId]);

  return (
    <div className="map-container" ref={containerRef}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
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
        <MapRefBridge mapRef={mapRef} />
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
