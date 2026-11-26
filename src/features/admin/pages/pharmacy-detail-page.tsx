import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { paths } from "@/app/paths";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { RadioCards } from "@/components/ui/radio-cards";
import { Textarea } from "@/components/ui/textarea";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { NpiCheckBadge, StatusBadge } from "@/features/admin/components/pharmacy-badges";
import { compareWithRegistry, lookupNpi, summarizeCheck } from "@/features/admin/lib/npi-registry";
import { can } from "@/features/admin/lib/permissions";
import { ACTION_LABELS, pharmacyReview, type ReviewAction } from "@/features/admin/services/pharmacy-review";
import type { AdminSession } from "@/features/admin/types";
import { authService } from "@/features/auth/auth-service";
import type { PharmacyAccount } from "@/features/auth/types";
import { formatUsd } from "@/features/requests/lib/formatters";
import { transactionStore } from "@/features/requests/services/transaction-store";
import { formatTime, WEEKDAYS } from "@/lib/opening-hours";
import { cn } from "@/lib/cn";
import { useToast, type ToastTone } from "@/lib/toast";

const dateFormat = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function RegistryPanel({ pharmacy, checked, onRerun }: { pharmacy: PharmacyAccount; checked: boolean; onRerun: () => void }) {
  const record = checked ? lookupNpi(pharmacy) : null;
  const rows = record ? compareWithRegistry(pharmacy, record) : [];
  return (
    <Panel
      title="NPI registry comparison"
      subtitle="What the applicant told us against the national NPI registry."
      action={
        <Button size="sm" icon={<Icon name="refresh" className="size-3.5" />} onClick={onRerun}>
          {checked ? "Re-run check" : "Run check"}
        </Button>
      }
      className="p-0 sm:p-0 [&>header]:px-5 [&>header]:pt-5 sm:[&>header]:px-6 sm:[&>header]:pt-6"
    >
      {!checked ? (
        <p className="px-5 pb-6 text-md text-muted sm:px-6">The check hasn't been run for this pharmacy yet.</p>
      ) : !record ? (
        <div className="px-5 pb-6 sm:px-6">
          <Notice tone="bad">No provider with NPI {pharmacy.pharmacy.npi} was found in the registry.</Notice>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-md">
            <thead className="bg-side-well text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                {["Field", "Applicant", "Registry", "Result"].map((label) => (
                  <th key={label} scope="col" className="px-4 py-3 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.field} className={cn(!row.match && "bg-warn-soft")}>
                  <td className="px-4 py-3 pl-5 text-ink-2 sm:pl-6">{row.field}</td>
                  <td className="px-4 py-3">{row.applicant}</td>
                  <td className="px-4 py-3">{row.registry}</td>
                  <td className={cn("px-4 py-3 pr-5 font-semibold sm:pr-6", row.match ? "text-good" : "text-warn")}>{row.match ? "Match" : "Mismatch"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

type Choice = "approve" | "reject" | "info";

function DecisionPanel({ pharmacy, account }: { pharmacy: PharmacyAccount; account: AdminSession }) {
  const { push } = useToast();
  const [choice, setChoice] = useState<Choice>("approve");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const canOnboard = can(account, "pharmacy_onboarding");
  const canManage = can(account, "pharmacy_management");
  const { status } = pharmacy;

  const decide = (action: ReviewAction, message: string, needsNote: boolean, tone: ToastTone = "success") => {
    if (needsNote && !note.trim()) {
      setError("Add a note for the pharmacy.");
      return;
    }
    pharmacyReview.record(pharmacy.id, action, needsNote ? note : null, account.name);
    setNote("");
    setError("");
    push(message, { tone, description: "The pharmacy has been emailed." });
  };

  const footer = <p className="text-sm text-muted">Every decision is recorded with your name and time.</p>;
  const locked = (permission: string) => (
    <Notice tone="warn" icon="lock">
      You need the {permission} permission to change this pharmacy.
    </Notice>
  );

  let body;
  if (status === "pending" || status === "info_requested") {
    body = !canOnboard ? (
      locked("Pharmacy onboarding")
    ) : (
      <div className="grid gap-4">
        <RadioCards<Choice>
          legend="Decision"
          hideLegend
          value={choice}
          onChange={(value) => {
            setChoice(value);
            setError("");
          }}
          options={[
            { value: "approve", label: "Approve" },
            { value: "reject", label: "Reject" },
            { value: "info", label: "Request more information" },
          ]}
        />
        {choice === "approve" ? (
          <>
            <Notice tone="accent" icon="mail">
              Approving activates the account and emails the pharmacy.
            </Notice>
            <Button variant="primary" size="lg" onClick={() => decide("approved", `${pharmacy.pharmacy.name} is now active.`, false)}>
              Approve pharmacy
            </Button>
          </>
        ) : (
          <>
            <Textarea
              label={choice === "reject" ? "Reason (sent to the pharmacy)" : "What do you need?"}
              placeholder={choice === "reject" ? "NPI does not belong to a pharmacy" : "Please send a corrected address"}
              value={note}
              error={error}
              onChange={(event) => setNote(event.target.value)}
            />
            {choice === "reject" ? (
              <Button size="lg" className="text-bad ring-bad/40" onClick={() => decide("rejected", `${pharmacy.pharmacy.name} was rejected.`, true, "warn")}>
                Reject pharmacy
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={() => decide("info_requested", "Request sent to the pharmacy.", true)}>
                Send request
              </Button>
            )}
          </>
        )}
      </div>
    );
  } else if (status === "active" || status === "suspended") {
    body = !canManage ? (
      locked("Pharmacy management")
    ) : status === "active" ? (
      <div className="grid gap-4">
        <Textarea
          label="Reason for suspending (sent to the pharmacy)"
          placeholder="Repeated claims without stock"
          value={note}
          error={error}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button size="lg" className="text-bad ring-bad/40" onClick={() => decide("suspended", `${pharmacy.pharmacy.name} is suspended.`, true, "warn")}>
          Suspend pharmacy
        </Button>
      </div>
    ) : (
      <div className="grid gap-4">
        {pharmacy.statusNote ? <Notice tone="warn">Suspended: {pharmacy.statusNote}</Notice> : null}
        <Button variant="primary" size="lg" onClick={() => decide("reinstated", `${pharmacy.pharmacy.name} is active again.`, false)}>
          Reinstate pharmacy
        </Button>
      </div>
    );
  } else {
    body = !canOnboard ? (
      locked("Pharmacy onboarding")
    ) : (
      <div className="grid gap-4">
        {pharmacy.statusNote ? <Notice tone="bad">Rejected: {pharmacy.statusNote}</Notice> : null}
        <Button size="lg" onClick={() => decide("reopened", "Moved back to the review queue.", false)}>
          Reopen review
        </Button>
      </div>
    );
  }

  return (
    <Panel title="Decision" action={<StatusBadge status={status} />} delay={60}>
      <div className="grid gap-4">
        {body}
        {footer}
      </div>
    </Panel>
  );
}

export function PharmacyDetailPage() {
  const { pharmacyId } = useParams();
  const account = adminAuth.useAccount();
  const pharmacies = authService.useAllPharmacies();
  const reviews = pharmacyReview.useLog();
  const transactions = transactionStore.use();
  const { push } = useToast();
  const pharmacy = pharmacies.find((item) => item.id === pharmacyId);

  if (!pharmacy || !account) return <Navigate to={paths.admin.pharmacies} replace />;

  const checked = pharmacyReview.wasChecked(reviews, pharmacy.id);
  const history = reviews.filter((entry) => entry.pharmacyId === pharmacy.id);
  const paid = transactions.filter((item) => item.pharmacyId === pharmacy.id && item.status === "paid");
  const { pharmacy: details } = pharmacy;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        back={{ to: `${paths.admin.pharmacies}?status=${pharmacy.status === "info_requested" ? "pending" : pharmacy.status}`, label: "Pharmacies" }}
        title={details.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={pharmacy.status} />
            applied {dateFormat.format(pharmacy.createdAt)} · NPI {details.npi}
            <NpiCheckBadge summary={summarizeCheck(pharmacy, checked)} />
          </span>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          <RegistryPanel
            pharmacy={pharmacy}
            checked={checked}
            onRerun={() => {
              pharmacyReview.record(pharmacy.id, "npi_checked", null, account.name);
              push("NPI check finished.");
            }}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Contact" delay={40}>
              <dl className="grid gap-2 text-md">
                {[
                  ["Pharmacist", [pharmacy.contactName, pharmacy.contactTitle].filter(Boolean).join(", ")],
                  ["Email", pharmacy.email],
                  ["Phone", details.phone],
                  ["Address", `${details.street}, ${details.city}, ${details.state} ${details.zip}`],
                  ["Compounding", details.canCompound ? "Yes" : "No"],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel title="Opening hours" delay={80}>
              <dl className="grid gap-1.5 text-md">
                {WEEKDAYS.map(([day, label]) => (
                  <div key={day} className="flex justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="tabular-nums">
                      {details.hours[day].open ? `${formatTime(details.hours[day].from)} – ${formatTime(details.hours[day].to)}` : "Closed"}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4">
          <DecisionPanel pharmacy={pharmacy} account={account} />
          <Panel title="Activity" delay={100}>
            <dl className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-[14px] bg-side-well p-3">
                <dt className="text-sm text-muted">Paid matches</dt>
                <dd className="text-xl font-bold tabular-nums">{paid.length}</dd>
              </div>
              <div className="rounded-[14px] bg-side-well p-3">
                <dt className="text-sm text-muted">Fees earned</dt>
                <dd className="text-xl font-bold tabular-nums">{formatUsd(paid.reduce((sum, item) => sum + item.amountCents, 0))}</dd>
              </div>
            </dl>
            {history.length === 0 ? (
              <p className="text-md text-muted">No decisions recorded yet.</p>
            ) : (
              <ol className="grid gap-3 border-l border-line-strong pl-4">
                {history.map((entry) => (
                  <li key={entry.id} className="relative text-md">
                    <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-accent ring-4 ring-card" />
                    <p className="font-semibold">{ACTION_LABELS[entry.action]}</p>
                    <p className="text-sm text-muted">
                      {entry.by} · {timeFormat.format(entry.at)}
                    </p>
                    {entry.note ? <p className="mt-0.5 text-ink-2">"{entry.note}"</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
