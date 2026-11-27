import { Link } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { authService } from "@/features/auth/auth-service";
import { profileChanges, type ProfileFields } from "@/features/pharmacy/services/profile-changes";
import { useToast } from "@/lib/toast";

const LABELS: Record<keyof ProfileFields, string> = {
  name: "Name",
  npi: "NPI",
  phone: "Phone",
  street: "Street",
  city: "City",
  state: "Region",
  zip: "Postal code",
  canCompound: "Compounds",
};

function show(value: ProfileFields[keyof ProfileFields]) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value || "—";
}

/** Pending pharmacy profile edits. Hours are not in here; pharmacies save those themselves. */
export function ProfileChangePanel({ pharmacyId, adminName }: { pharmacyId: string; adminName: string }) {
  const changes = profileChanges.use();
  const pending = changes.find((item) => item.pharmacyId === pharmacyId && item.status === "pending");
  const pharmacies = authService.useAllPharmacies();
  const { push } = useToast();
  if (!pending) return null;
  const current = pharmacies.find((item) => item.id === pharmacyId);
  if (!current) return null;

  const rows = (Object.keys(LABELS) as Array<keyof ProfileFields>).filter(
    (key) => JSON.stringify(pending.proposed[key]) !== JSON.stringify(current.pharmacy[key]),
  );

  return (
    <Panel title="Change request" subtitle="Nothing here is live until you approve it.">
      <div className="grid gap-3">
        {rows.map((key) => (
          <p key={key} className="text-md">
            <span className="text-muted">{LABELS[key]}: </span>
            <span className="line-through">{show(current.pharmacy[key])}</span> → <strong>{show(pending.proposed[key])}</strong>
          </p>
        ))}
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => {
              authService.applyProfile(pharmacyId, pending.proposed);
              profileChanges.decide(pending.id, "approved", adminName);
              push("Pharmacy details updated.");
            }}
          >
            Approve
          </Button>
          <Button
            onClick={() => {
              profileChanges.decide(pending.id, "rejected", adminName);
              push("Change request declined.");
            }}
          >
            Decline
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/** Every pharmacy profile edit waiting on FindRx. Shown on the Pharmacies page, not only inside one pharmacy. */
export function ProfileChangeQueue({ adminName }: { adminName: string }) {
  const changes = profileChanges.use();
  const pending = changes.filter((item) => item.status === "pending");
  const pharmacies = authService.useAllPharmacies();
  const { push } = useToast();

  return (
    <Panel title="Profile change requests" subtitle="A pharmacy asked to change its name, NPI, address, phone, or compounding. Nothing is live until you approve it.">
      {pending.length === 0 ? (
        <p className="text-md text-muted">No profile changes waiting.</p>
      ) : (
        <ul className="grid gap-4">
          {pending.map((item) => {
            const current = pharmacies.find((pharmacy) => pharmacy.id === item.pharmacyId);
            const rows = current
              ? (Object.keys(LABELS) as Array<keyof ProfileFields>).filter(
                  (key) => JSON.stringify(item.proposed[key]) !== JSON.stringify(current.pharmacy[key]),
                )
              : [];
            return (
              <li key={item.id} className="grid gap-2 rounded-[16px] bg-side-well p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={paths.admin.pharmacy(item.pharmacyId)} className="font-semibold hover:underline">
                    {item.pharmacyName}
                  </Link>
                  <span className="text-sm text-muted">{new Date(item.submittedAt).toLocaleString()}</span>
                </div>
                {rows.map((key) => (
                  <p key={key} className="text-md">
                    <span className="text-muted">{LABELS[key]}: </span>
                    <span className="line-through">{current ? show(current.pharmacy[key]) : "—"}</span> → <strong>{show(item.proposed[key])}</strong>
                  </p>
                ))}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      authService.applyProfile(item.pharmacyId, item.proposed);
                      profileChanges.decide(item.id, "approved", adminName);
                      push(`${item.pharmacyName} updated.`);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      profileChanges.decide(item.id, "rejected", adminName);
                      push("Change request declined.");
                    }}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
