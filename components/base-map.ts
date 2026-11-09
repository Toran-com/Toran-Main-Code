import "maplibre-gl/dist/maplibre-gl.css";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import type { Map as LeafletMap } from "leaflet";
import type { StyleSpecification } from "maplibre-gl";

// The streets under the maps, drawn in the browser by MapLibre from
// OpenFreeMap's tiles in Toran's colours (components/map-style.ts).
// Downloaded by uk-map.ts only once a map is on the page, the browser
// can draw it (WebGL) and the style has arrived; elsewhere the map uses
// OpenStreetMap's pictures.
export function drawStreets(map: LeafletMap, style: StyleSpecification) {
  maplibreGL({
    style,
    // Sharp on any screen, without drawing more than a phone needs.
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  }).addTo(map);
}
