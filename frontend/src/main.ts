import "./style.css";
import type L from "leaflet";
import { enrich, ApiError } from "./api";
import { DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS } from "./constants";
import { categoryLabel, formatDistance, poiDisplayName } from "./format";
import { createMap, createPoiMarker, clearMarkers, setSelectionMarker, setRadiusCircle } from "./map";
import { buildEnrichRequest, clampRadius } from "./request";
import { RequestGuard } from "./requestGuard";
import type { NormalizedPoi, PoiCategory } from "./types";

const map = createMap("map");

const form = document.querySelector<HTMLFormElement>("#search-form")!;
const radiusInput = document.querySelector<HTMLInputElement>("#radius")!;
const searchButton = document.querySelector<HTMLButtonElement>("#search-button")!;
const selectionStatus = document.querySelector<HTMLParagraphElement>("#selection-status")!;
const resultStatus = document.querySelector<HTMLDivElement>("#result-status")!;
const resultList = document.querySelector<HTMLUListElement>("#result-list")!;
const categoryCheckboxes = Array.from(
  document.querySelectorAll<HTMLInputElement>('input[name="category"]'),
);

radiusInput.max = String(MAX_RADIUS_METERS);
radiusInput.value = String(DEFAULT_RADIUS_METERS);

let selectedLocation: { latitude: number; longitude: number } | null = null;
let selectionMarker: L.Marker | null = null;
let radiusCircle: L.Circle | null = null;
let resultMarkers: L.Layer[] = [];
let requestInFlight = false;

const requestGuard = new RequestGuard();

function selectedCategories(): PoiCategory[] {
  return categoryCheckboxes.filter((c) => c.checked).map((c) => c.value as PoiCategory);
}

function updateRadiusCircle(): void {
  if (!selectedLocation) return;
  radiusCircle = setRadiusCircle(
    map,
    radiusCircle,
    selectedLocation.latitude,
    selectedLocation.longitude,
    clampRadius(radiusInput.valueAsNumber),
  );
}

function updateSearchButtonState(): void {
  searchButton.disabled = requestInFlight || selectedLocation === null || selectedCategories().length === 0;
}

function resetResults(): void {
  clearMarkers(resultMarkers);
  resultList.innerHTML = "";
  resultStatus.textContent = "";
  resultStatus.className = "status";
}

map.on("click", (event: L.LeafletMouseEvent) => {
  const { lat, lng } = event.latlng;
  selectedLocation = { latitude: lat, longitude: lng };
  selectionMarker = setSelectionMarker(map, selectionMarker, lat, lng);
  selectionStatus.textContent = `Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  updateRadiusCircle();
  requestGuard.invalidate();
  resetResults();
  updateSearchButtonState();
});

radiusInput.addEventListener("input", () => {
  updateRadiusCircle();
  requestGuard.invalidate();
  resetResults();
});

categoryCheckboxes.forEach((checkbox) =>
  checkbox.addEventListener("change", () => {
    requestGuard.invalidate();
    resetResults();
    updateSearchButtonState();
  }),
);

function renderPois(pois: NormalizedPoi[]): void {
  clearMarkers(resultMarkers);
  resultList.innerHTML = "";

  for (const poi of pois) {
    resultMarkers.push(createPoiMarker(map, poi));

    const item = document.createElement("li");

    // Built with textContent (not innerHTML) since poi.name/category come
    // from OSM data and must never be interpreted as markup.
    const categoryEl = document.createElement("div");
    categoryEl.className = "poi-category";
    categoryEl.textContent = categoryLabel(poi.category);

    const nameEl = document.createElement("div");
    nameEl.textContent = `${poiDisplayName(poi)} — ${formatDistance(poi.distanceMeters)}`;

    const precisionEl = document.createElement("div");
    precisionEl.className = "poi-precision";
    precisionEl.textContent = poi.approximate ? "approximate centroid" : "exact location";

    item.append(categoryEl, nameEl, precisionEl);
    resultList.appendChild(item);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (requestInFlight || !selectedLocation || selectedCategories().length === 0) return;

  // Snapshot before the request starts; if the selection, radius, or
  // categories change before it resolves, the response is stale and must
  // not overwrite whatever the user is looking at by then.
  const requestSnapshot = requestGuard.snapshot();

  requestInFlight = true;
  updateSearchButtonState();
  resultStatus.className = "status loading";
  resultStatus.textContent = "Searching nearby places…";
  resultList.innerHTML = "";
  clearMarkers(resultMarkers);

  const body = buildEnrichRequest({
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    radiusMeters: radiusInput.valueAsNumber,
    categories: selectedCategories(),
  });

  try {
    const result = await enrich(body);
    if (requestGuard.isStale(requestSnapshot)) return;

    if (result.pois.length === 0) {
      resultStatus.className = "status empty";
      resultStatus.textContent = `No matching points of interest found within ${body.radiusMeters} m.`;
    } else {
      resultStatus.className = "status";
      resultStatus.textContent = `Found ${result.pois.length} nearest place(s).`;
      renderPois(result.pois);
    }
  } catch (error) {
    if (requestGuard.isStale(requestSnapshot)) return;

    resultStatus.className = "status error";
    if (error instanceof ApiError) {
      resultStatus.textContent = error.message;
    } else {
      resultStatus.textContent = "Something went wrong. Please try again.";
    }
  } finally {
    requestInFlight = false;
    updateSearchButtonState();
  }
});

updateSearchButtonState();
