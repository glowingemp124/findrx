import { authService } from "@/features/auth/auth-service";
import type { PharmacyAccount } from "@/features/auth/types";
import { createPersistentStore } from "@/lib/persistent-store";

export type LatLng = { lat: number; lng: number };

export const MILES_TO_METERS = 1609.344;

/** Seeded pharmacies, so the circle is accurate before any geocode call. */
const SEEDED: Record<string, LatLng> = {
  "pharmacy-riverbend": { lat: 29.7704, lng: -95.3977 },
  "pharmacy-northside": { lat: 30.3111, lng: -97.7279 },
  "pharmacy-eastgate": { lat: 29.7802, lng: -95.5456 },
  "pharmacy-bellaire": { lat: 29.7055, lng: -95.4617 },
  "pharmacy-harbor": { lat: 29.7589, lng: -95.3676 },
  "pharmacy-maple": { lat: 30.2447, lng: -97.7627 },
  "pharmacy-bayou": { lat: 29.7441, lng: -95.3914 },
  "pharmacy-cedar": { lat: 32.7811, lng: -96.7966 },
  "pharmacy-gulf": { lat: 29.2921, lng: -94.7891 },
  "pharmacy-pine": { lat: 30.3116, lng: -95.4561 },
};

const geocoded = createPersistentStore<Record<string, LatLng>>("findrx-pharmacy-points", {});

export function milesBetween(a: LatLng, b: LatLng) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthMiles = 3958.7613;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthMiles * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pointFor(account: PharmacyAccount): LatLng | null {
  return SEEDED[account.id] ?? geocoded.get()[account.id] ?? null;
}

export function pointForId(pharmacyId: string): LatLng | null {
  const account = authService.listAccounts().find((item) => item.id === pharmacyId);
  return account ? pointFor(account) : null;
}

export type CoveragePharmacy = { id: string; point: LatLng; canCompound: boolean };

/** Active pharmacies that are accepting requests and have a location. */
export function coveragePharmacies(): CoveragePharmacy[] {
  return authService
    .listAccounts()
    .filter((account) => account.status === "active" && account.acceptingRequests)
    .flatMap((account) => {
      const point = pointFor(account);
      return point ? [{ id: account.id, point, canCompound: account.pharmacy.canCompound }] : [];
    });
}

/** `0` means Any: no mile cap. The slider's last stop stores this. */
export const isUnlimitedRadius = (radiusMiles: number) => radiusMiles <= 0;

export function pharmaciesNear(origin: LatLng, radiusMiles: number, needsCompounding: boolean) {
  return coveragePharmacies().filter(
    (pharmacy) =>
      (!needsCompounding || pharmacy.canCompound) &&
      (isUnlimitedRadius(radiusMiles) || milesBetween(origin, pharmacy.point) <= radiusMiles),
  );
}

/** Fills in locations for pharmacies that joined after the seed list. */
export function geocodeMissing(geocoder: google.maps.Geocoder): Promise<void> {
  const missing = authService.listAccounts().filter((account) => account.status === "active" && !pointFor(account));
  if (missing.length === 0) return Promise.resolve();
  return Promise.all(
    missing.map(
      (account) =>
        new Promise<void>((resolve) => {
          const { street, city, state, zip } = account.pharmacy;
          geocoder.geocode({ address: `${street}, ${city}, ${state} ${zip}` }, (results, status) => {
            const location = results?.[0]?.geometry?.location;
            if (status === "OK" && location) {
              geocoded.update((current) => ({ ...current, [account.id]: { lat: location.lat(), lng: location.lng() } }));
            }
            resolve();
          });
        }),
    ),
  ).then(() => undefined);
}
