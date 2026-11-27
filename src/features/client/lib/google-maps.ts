const key = () =>
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

let pending: Promise<void> | null = null;

/** Loads the Maps JavaScript API once. Places powers the address suggestions. */
export function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps?.Geocoder) return Promise.resolve();
  const apiKey = key();
  if (!apiKey) return Promise.reject(new Error("missing-key"));
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        pending = null;
        reject(new Error("map-failed"));
      };
      document.head.appendChild(script);
    });
  }
  return pending;
}

export type ChosenPlace = {
  /** ZIP, or "City, ST" when the pin has no ZIP. This is what the request stores. */
  area: string;
  /** Full address shown next to the Area field. */
  detail: string;
  latitude: number;
  longitude: number;
};

const component = (result: google.maps.GeocoderResult, type: string) =>
  result.address_components?.find((entry) => entry.types.includes(type));

/** Turns a geocoder result into the area the rest of the app already understands. Any country. */
export function placeFromResult(result: google.maps.GeocoderResult, point: google.maps.LatLngLiteral): ChosenPlace | null {
  const postal = component(result, "postal_code")?.long_name || component(result, "postal_code")?.short_name || "";
  const city =
    component(result, "locality")?.long_name ||
    component(result, "postal_town")?.long_name ||
    component(result, "sublocality")?.long_name ||
    component(result, "administrative_area_level_2")?.long_name ||
    component(result, "neighborhood")?.long_name ||
    "";
  const region = component(result, "administrative_area_level_1")?.short_name || component(result, "administrative_area_level_1")?.long_name || "";
  const country = component(result, "country")?.long_name || "";
  const cityLine = [city, region].filter(Boolean).join(", ");
  const area = postal || cityLine || country || result.formatted_address || "";
  if (!area) return null;
  return {
    area,
    detail: result.formatted_address || cityLine || area,
    latitude: point.lat,
    longitude: point.lng,
  };
}
