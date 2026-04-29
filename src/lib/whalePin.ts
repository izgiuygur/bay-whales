// Shared pin-icon helpers used by both the desktop map and mobile
// mini/expanded maps. Keeping them in one module ensures every map
// surface renders pins with identical geometry + colors.

import L from "leaflet";
import {
  SPECIES_COLORS,
  OTHER_SPECIES_COLOR,
  type SpeciesKey,
} from "../types/whale";

// Re-exported for any caller that imports the pin fallback by name.
// Always tracks OTHER_SPECIES_COLOR so the "Other" pill swatch and
// the fallback pin tone stay in lockstep.
export const PIN_FALLBACK_COLOR = OTHER_SPECIES_COLOR;

export function getMarkerColor(species: string): string {
  if (species in SPECIES_COLORS) {
    return SPECIES_COLORS[species as SpeciesKey].pin;
  }
  return OTHER_SPECIES_COLOR;
}

export function speciesSlug(species: string): string {
  return (
    species
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "other"
  );
}

// Teardrop pin width (px) at a given zoom. Default ladder, shrunk ~15%.
export function pinSizeForZoom(zoom: number): number {
  if (zoom >= 13) return 20;
  if (zoom >= 11) return 15;
  if (zoom >= 10) return 12;
  if (zoom >= 9) return 9;
  return 7;
}

function buildPinSvg(size: number, fill: string): string {
  const h = Math.round(size * 1.3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 24 31"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 19 12 19s12-10 12-19C24 5.4 18.6 0 12 0z" fill="${fill}"/><circle cx="12" cy="11" r="4.5" fill="white"/></svg>`;
}

export function createPinIcon(
  color: string,
  size: number,
  species: string
): L.DivIcon {
  const h = Math.round(size * 1.3);
  return L.divIcon({
    html: buildPinSvg(size, color),
    className: `whale-pin whale-pin--${speciesSlug(species)}`,
    iconSize: [size, h],
    iconAnchor: [size / 2, h],
  });
}

export function createSelectedPinIcon(zoom: number): L.DivIcon {
  const size = Math.round(pinSizeForZoom(zoom) * 1.4);
  const h = Math.round(size * 1.3);
  return L.divIcon({
    html: buildPinSvg(size, "#111"),
    className: "whale-pin selected",
    iconSize: [size, h],
    iconAnchor: [size / 2, h],
  });
}

const iconCache = new Map<string, L.DivIcon>();

export function getPinIcon(
  species: string,
  isSelected: boolean,
  zoom: number
): L.DivIcon {
  if (isSelected) return createSelectedPinIcon(zoom);
  const size = pinSizeForZoom(zoom);
  const key = `${species}-${size}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, createPinIcon(getMarkerColor(species), size, species));
  }
  return iconCache.get(key)!;
}
