// Expose Leaflet as a window global so the legacy
// `overlapping-marker-spiderfier-leaflet` plugin can find it at load
// time. This module must be imported BEFORE `overlapping-marker-
// spiderfier-leaflet` so the side-effectful plugin sees `window.L`
// when it evaluates.
import L from "leaflet";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as unknown as any).L = L;
