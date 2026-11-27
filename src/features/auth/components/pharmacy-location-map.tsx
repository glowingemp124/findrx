import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { loadGoogleMaps } from "@/features/client/lib/google-maps";

export type PharmacyLocation = {
  street: string;
  city: string;
  state: string;
  zip: string;
  detail: string;
};

const WORLD = { lat: 20, lng: 0 };

function fromResult(result: google.maps.GeocoderResult): PharmacyLocation | null {
  const part = (type: string) => result.address_components?.find((entry) => entry.types.includes(type));
  const street =
    [part("street_number")?.long_name, part("route")?.long_name].filter(Boolean).join(" ") ||
    part("premise")?.long_name ||
    part("establishment")?.long_name ||
    "";
  const city =
    part("locality")?.long_name ||
    part("postal_town")?.long_name ||
    part("sublocality")?.long_name ||
    part("administrative_area_level_2")?.long_name ||
    "";
  const state = part("administrative_area_level_1")?.short_name || part("administrative_area_level_1")?.long_name || "";
  const zip = part("postal_code")?.long_name || part("postal_code")?.short_name || "";
  const country = part("country")?.long_name || "";
  if (!street || !city) return null;
  return {
    street,
    city,
    state,
    zip,
    detail: result.formatted_address || [street, city, state, zip, country].filter(Boolean).join(", "),
  };
}

/** Picks a street address from the map. The typed street, city, state, and ZIP fields are not used. */
export function PharmacyLocationMap({
  detail,
  error,
  onPick,
}: {
  detail: string;
  error?: string;
  onPick: (location: PharmacyLocation) => void;
}) {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancel = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancel) setReady(true);
      })
      .catch(() => {
        if (!cancel) setMapError("The map couldn't load. Check the connection and try again.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const apply = (map: google.maps.Map, result: google.maps.GeocoderResult, fit: boolean) => {
    const location = fromResult(result);
    const point = result.geometry?.location;
    if (!location || !point) {
      setNote("Choose the street.");
      return;
    }
    setNote("");
    onPickRef.current(location);
    if (searchRef.current) searchRef.current.value = location.detail;
    const position = { lat: point.lat(), lng: point.lng() };
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({ map, position, draggable: true, title: "Pharmacy" });
      markerRef.current.addListener("dragend", () => {
        const dragged = markerRef.current?.getPosition();
        if (dragged) reverse(dragged);
      });
    } else {
      markerRef.current.setPosition(position);
      markerRef.current.setMap(map);
    }
    if (fit) {
      map.panTo(position);
      map.setZoom(16);
    }
  };

  const reverse = (latLng: google.maps.LatLng) => {
    const geocoder = geocoderRef.current;
    const map = mapRef.current;
    if (!geocoder || !map) return;
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === "OK" && results?.[0]) apply(map, results[0], false);
      else setNote("Couldn't read that spot. Search the street address.");
    });
  };

  useEffect(() => {
    if (!ready || !node || mapRef.current) return;
    const map = new google.maps.Map(node, {
      center: WORLD,
      zoom: 2,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      clickableIcons: false,
    });
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();
    const input = searchRef.current;
    if (input && google.maps.places?.Autocomplete) {
      const autocomplete = new google.maps.places.Autocomplete(input, {
        fields: ["address_components", "formatted_address", "geometry"],
        types: ["geocode"],
      });
      autocomplete.addListener("place_changed", () => {
        const picked = autocomplete.getPlace();
        if (picked.address_components && picked.geometry) apply(map, picked as google.maps.GeocoderResult, true);
      });
    }
    map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (event.latLng) reverse(event.latLng);
    });
  }, [ready, node]);

  const search = () => {
    const query = searchRef.current?.value.trim() ?? "";
    const geocoder = geocoderRef.current;
    const map = mapRef.current;
    if (!query || !geocoder || !map) return;
    geocoder.geocode({ address: query }, (results, status) => {
      if (status === "OK" && results?.[0]) apply(map, results[0], true);
      else setNote("No match. Try the street and city.");
    });
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setNote("This browser can't share your location. Search the street address.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => reverse(new google.maps.LatLng(position.coords.latitude, position.coords.longitude)),
      () => setNote("Location is off. Search the street address."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="grid gap-2">
      <span id={searchId} className="text-sm font-semibold text-ink-2">
        Pharmacy location
      </span>
      <div className="flex gap-2">
        <input
          ref={searchRef}
          aria-labelledby={searchId}
          placeholder="Search the street address"
          autoComplete="off"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              search();
            }
          }}
          className="h-10 min-w-0 flex-1 rounded-full bg-card px-3.5 text-md text-ink shadow-raise ring-1 ring-line-strong outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
        />
        <Button type="button" onClick={search} disabled={!ready} aria-label="Search this address">
          <Icon name="search" />
        </Button>
      </div>
      <Button type="button" variant="ghost" className="justify-start px-1" onClick={locate} disabled={!ready}>
        <Icon name="navigation" />
        Use my current location
      </Button>
      <div className="relative h-[200px] overflow-hidden rounded-[16px] bg-side-well ring-1 ring-line">
        <div ref={setNode} className="h-full w-full" />
        {!ready && !mapError ? <p className="absolute inset-0 grid place-items-center text-sm text-muted">Loading map…</p> : null}
        {mapError ? <p className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-muted">{mapError}</p> : null}
      </div>
      {detail ? <p className="text-sm text-ink">{detail}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-semibold text-bad">
          {error}
        </p>
      ) : null}
      {note ? <p className="text-xs font-semibold text-bad">{note}</p> : null}
    </div>
  );
}
