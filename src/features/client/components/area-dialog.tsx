import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { PhoneField, nationalError } from "@/features/client/components/phone-field";
import { loadGoogleMaps, placeFromResult, type ChosenPlace } from "@/features/client/lib/google-maps";
import { isPersonName } from "@/features/client/lib/validate-draft";
import {
  coveragePharmacies,
  geocodeMissing,
  milesBetween,
  MILES_TO_METERS,
  type CoveragePharmacy,
} from "@/features/client/lib/pharmacy-coverage";
import { platformSettings } from "@/features/platform/platform-settings";
import type { RequestDraft } from "@/features/requests/types";

export type AreaSubmission = ChosenPlace & {
  radiusMiles: number;
  fullName: string;
  phone: string;
};

const WORLD: google.maps.LatLngLiteral = { lat: 20, lng: 0 };

/** The last stop on the slider is Any, stored as 0 miles. */
function sliderMiles(stored: number, max: number) {
  if (stored <= 0) return max;
  return Math.min(Math.max(stored, 1), max);
}

const youIcon = (): google.maps.Symbol => ({
  path: google.maps.SymbolPath.CIRCLE,
  scale: 9,
  fillColor: "#101820",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
});

/** Map, radius, name, and phone on one screen so those three fields are explicit. */
export function AreaDialog({
  open,
  draft,
  onClose,
  onConfirm,
}: {
  open: boolean;
  draft: RequestDraft;
  onClose: () => void;
  onConfirm: (submission: AreaSubmission) => void;
}) {
  const maxMiles = platformSettings.use().maxSearchMiles;
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [mapNode, setMapNode] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const youRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [geoNote, setGeoNote] = useState("");
  const [place, setPlace] = useState<ChosenPlace | null>(null);
  const [miles, setMiles] = useState(() => sliderMiles(draft.radiusMiles, platformSettings.get().maxSearchMiles));
  const [name, setName] = useState(draft.fullName);
  const [phone, setPhone] = useState(draft.phone);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [placeError, setPlaceError] = useState("");
  const [points, setPoints] = useState<CoveragePharmacy[]>([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlace(null);
    setName(draft.fullName);
    setPhone(draft.phone);
    setMiles(sliderMiles(draft.radiusMiles, platformSettings.get().maxSearchMiles));
    setNameError("");
    setPhoneError("");
    setPlaceError("");
    setGeoNote("");
    setMapError("");
    let cancel = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancel) setReady(true);
      })
      .catch((error: Error) => {
        if (cancel) return;
        setMapError(error.message === "missing-key" ? "The map key is missing." : "The map couldn't load. Check the connection and try again.");
      });
    return () => {
      cancel = true;
    };
    // Reset only when the dialog opens, not when the draft changes underneath it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !ready || !mapNode) return;
    const map = new google.maps.Map(mapNode, {
      center: WORLD,
      zoom: 2,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      clickableIcons: false,
    });
    mapRef.current = map;
    const geocoder = new google.maps.Geocoder();
    geocoderRef.current = geocoder;
    setPoints(coveragePharmacies());
    void geocodeMissing(geocoder).then(() => setPoints(coveragePharmacies()));

    const input = searchRef.current;
    if (input && google.maps.places?.Autocomplete) {
      const autocomplete = new google.maps.places.Autocomplete(input, {
        fields: ["address_components", "formatted_address", "geometry"],
        types: ["geocode"],
      });
      autocomplete.addListener("place_changed", () => {
        const picked = autocomplete.getPlace();
        const location = picked.geometry?.location;
        if (!location || !picked.address_components) {
          setPlaceError("Choose one of the suggested addresses.");
          return;
        }
        const next = placeFromResult(picked as google.maps.GeocoderResult, { lat: location.lat(), lng: location.lng() });
        if (!next) {
          setPlaceError("That place has no city or postal code.");
          return;
        }
        applyPlace(map, next, true);
      });
    }

    map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (event.latLng) void reverse(event.latLng);
    });

    return () => {
      google.maps.event.clearInstanceListeners(map);
      mapRef.current = null;
      geocoderRef.current = null;
      circleRef.current = null;
      youRef.current = null;
    };
    // Recreate the map once its container is on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready, mapNode]);

  const applyPlace = (map: google.maps.Map, next: ChosenPlace, fit: boolean) => {
    setPlace(next);
    setPlaceError("");
    setGeoNote("");
    const position = { lat: next.latitude, lng: next.longitude };
    if (!youRef.current) {
      youRef.current = new google.maps.Marker({
        map,
        position,
        icon: youIcon(),
        draggable: true,
        title: "Search center",
        zIndex: 2,
      });
      youRef.current.addListener("dragend", () => {
        const dragged = youRef.current?.getPosition();
        if (dragged) void reverse(dragged);
      });
    } else {
      youRef.current.setPosition(position);
      youRef.current.setMap(map);
    }
    if (fit) {
      map.panTo(position);
      map.setZoom(12);
    }
  };

  const reverse = (latLng: google.maps.LatLng) => {
    const geocoder = geocoderRef.current;
    const map = mapRef.current;
    if (!geocoder || !map) return;
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status !== "OK" || !results?.[0]) {
        setPlaceError("Couldn't read that spot. Search an address.");
        return;
      }
      const next = placeFromResult(results[0], { lat: latLng.lat(), lng: latLng.lng() });
      if (!next) {
        setPlaceError("That spot has no city or postal code.");
        return;
      }
      applyPlace(map, next, false);
    });
  };

  const search = () => {
    const query = searchRef.current?.value.trim() ?? "";
    const geocoder = geocoderRef.current;
    const map = mapRef.current;
    if (!query || !geocoder || !map) return;
    geocoder.geocode({ address: query }, (results, status) => {
      if (status !== "OK" || !results?.[0]?.geometry?.location) {
        setPlaceError("No match for that search.");
        return;
      }
      const location = results[0].geometry.location;
      const next = placeFromResult(results[0], { lat: location.lat(), lng: location.lng() });
      if (!next) {
        setPlaceError("That place has no city or postal code.");
        return;
      }
      if (searchRef.current) searchRef.current.value = next.detail;
      applyPlace(map, next, true);
    });
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoNote("This browser can't share your location. Search an address instead.");
      return;
    }
    setLocating(true);
    setGeoNote("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        reverse(latLng);
        mapRef.current?.panTo(latLng);
        mapRef.current?.setZoom(13);
      },
      () => {
        setLocating(false);
        setGeoNote("Location is off for this browser. Search an address instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const unlimited = miles >= maxMiles;
  const inside = place
    ? points.filter(
        (pharmacy) =>
          (!draft.needsCompounding || pharmacy.canCompound) &&
          (unlimited || milesBetween({ lat: place.latitude, lng: place.longitude }, pharmacy.point) <= miles),
      )
    : [];

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!place || unlimited) {
      circleRef.current?.setMap(null);
      return;
    }
    const center = { lat: place.latitude, lng: place.longitude };
    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius: miles * MILES_TO_METERS,
        fillColor: "#0b7383",
        fillOpacity: 0.16,
        strokeColor: "#0b7383",
        strokeWeight: 2,
        clickable: false,
      });
    } else {
      circleRef.current.setMap(map);
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(miles * MILES_TO_METERS);
    }
    const bounds = circleRef.current.getBounds();
    if (bounds) map.fitBounds(bounds, 28);
  }, [place, miles, ready, unlimited]);

  const confirm = () => {
    const fullName = name.trim().replace(/\s+/g, " ");
    const phoneProblem = nationalError(phone);
    let ok = true;
    if (!place) {
      setPlaceError("Search an address or use your current location.");
      ok = false;
    } else setPlaceError("");
    if (fullName && !isPersonName(fullName)) {
      setNameError("Use letters only.");
      ok = false;
    } else setNameError("");
    if (phoneProblem) {
      setPhoneError(phoneProblem);
      ok = false;
    } else setPhoneError("");
    if (!ok || !place) return;
    onConfirm({ ...place, radiusMiles: unlimited ? 0 : miles, fullName, phone: phone.trim() });
  };

  const countLabel = unlimited
    ? inside.length === 1
      ? "1 pharmacy at any distance"
      : `${inside.length} pharmacies at any distance`
    : inside.length === 1
      ? "1 pharmacy in this circle"
      : `${inside.length} pharmacies in this circle`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Where should we search?"
      footer={
        <Button variant="primary" size="lg" className="h-12 w-full text-lg" onClick={confirm} disabled={!ready && !mapError}>
          Use this area
        </Button>
      }
    >
      <div className="grid gap-3 pb-1">
        <div className="grid gap-1.5">
          <label htmlFor={searchId} className="text-sm font-semibold text-ink-2">
            Area
          </label>
          <div className="flex gap-2">
            <input
              id={searchId}
              ref={searchRef}
              placeholder="City, postal code, or street"
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
              Search
            </Button>
          </div>
          <Button type="button" variant="ghost" className="justify-start px-1" onClick={locate} disabled={!ready || locating}>
            <Icon name="navigation" />
            {locating ? "Finding you…" : "Use my current location"}
          </Button>
          {place ? (
            <p className="text-sm text-ink">
              <span className="font-semibold">{place.area}</span>
              <span className="text-muted"> · {place.detail}</span>
            </p>
          ) : null}
          {placeError ? (
            <p role="alert" className="text-xs font-semibold text-bad">
              {placeError}
            </p>
          ) : null}
          {geoNote ? <p className="text-xs text-muted">{geoNote}</p> : null}
        </div>

        <div className="relative h-[180px] overflow-hidden rounded-[16px] bg-side-well ring-1 ring-line">
          <div ref={setMapNode} className="h-full w-full" />
          {!ready && !mapError ? (
            <p className="absolute inset-0 grid place-items-center text-sm text-muted">Loading map…</p>
          ) : null}
          {mapError ? <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted">{mapError}</p> : null}
          {place ? (
            <p className="absolute inset-x-2 bottom-2 rounded-full bg-panel/95 px-3 py-1.5 text-center text-sm font-semibold text-ink shadow-raise">
              {countLabel}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-ink-2">Radius</p>
            <p className="text-lg font-bold tabular-nums">{unlimited ? "Any" : `${miles} miles`}</p>
          </div>
          <input
            type="range"
            min={1}
            max={maxMiles}
            value={miles}
            aria-label="Search distance in miles"
            aria-valuetext={unlimited ? "Any" : `${miles} miles`}
            onChange={(event) => setMiles(Number(event.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <TextField
          label="Name (optional)"
          value={name}
          error={nameError}
          autoComplete="name"
          placeholder="Your name"
          onChange={(event) => setName(event.target.value)}
        />
        <PhoneField label="Mobile number" value={phone} error={phoneError} onChange={setPhone} />
        {draft.needsCompounding ? <Notice tone="accent">Compounding pharmacies only.</Notice> : null}
      </div>
    </Modal>
  );
}
