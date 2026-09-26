import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { SULTANAHMET } from "./constants";
import type { NormalizedPoi } from "./types";

// Vite bundles Leaflet's default marker images under hashed URLs; without
// this the default icon paths (relative to leaflet.js) 404 in the browser.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export function createMap(containerId: string): L.Map {
  const map = L.map(containerId).setView([SULTANAHMET.latitude, SULTANAHMET.longitude], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  return map;
}

export function setSelectionMarker(
  map: L.Map,
  existing: L.Marker | null,
  latitude: number,
  longitude: number,
): L.Marker {
  existing?.remove();
  return L.marker([latitude, longitude]).addTo(map).bindPopup("Selected location");
}

/** Visualizes the search radius around the selected point; reused across radius changes. */
export function setRadiusCircle(
  map: L.Map,
  existing: L.Circle | null,
  latitude: number,
  longitude: number,
  radiusMeters: number,
): L.Circle {
  if (existing) {
    existing.setLatLng([latitude, longitude]);
    existing.setRadius(radiusMeters);
    return existing;
  }

  return L.circle([latitude, longitude], {
    radius: radiusMeters,
    color: "#1d4ed8",
    weight: 1,
    fillOpacity: 0.05,
  }).addTo(map);
}

/** Solid marker for exact node coordinates, dashed/translucent for approximate way/relation centroids. */
export function createPoiMarker(map: L.Map, poi: NormalizedPoi): L.CircleMarker {
  const marker = L.circleMarker([poi.latitude, poi.longitude], {
    radius: 8,
    color: poi.approximate ? "#c2410c" : "#1d4ed8",
    fillColor: poi.approximate ? "#fb923c" : "#60a5fa",
    fillOpacity: poi.approximate ? 0.5 : 0.85,
    dashArray: poi.approximate ? "4 3" : undefined,
    weight: 2,
  }).addTo(map);

  // Built as a DOM node with textContent (not an HTML string) so an
  // OSM-supplied name can never be interpreted as markup.
  const precision = poi.approximate ? "approximate centroid" : "exact location";
  const popupContent = document.createElement("span");
  popupContent.textContent = `${poi.name ?? poi.category} (${precision}, ${poi.distanceMeters} m)`;
  marker.bindPopup(popupContent);
  return marker;
}

export function clearMarkers(markers: L.Layer[]): void {
  markers.forEach((marker) => marker.remove());
  markers.length = 0;
}
