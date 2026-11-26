import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  ALL_SEARCH_RADII,
  missingPlaceholders,
  platformSettings,
  SMS_TEMPLATES,
  type PlatformSettings,
  type SmsTemplateId,
} from "@/features/platform/platform-settings";
import { cn } from "@/lib/cn";
import { TIME_OPTIONS } from "@/lib/opening-hours";
import { useToast } from "@/lib/toast";

type Form = Omit<PlatformSettings, "updatedAt" | "updatedBy" | "feeCents"> & { fee: string };

const toForm = ({ updatedAt: _a, updatedBy: _b, feeCents, ...rest }: PlatformSettings): Form => ({ ...rest, fee: (feeCents / 100).toFixed(2) });

const stamp = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function AdminSettingsPage() {
  const saved = platformSettings.use();
  const account = adminAuth.useAccount();
  const { push } = useToast();
  const [form, setForm] = useState<Form>(() => toForm(saved));
  const [template, setTemplate] = useState<SmsTemplateId>("pharmacy_found");
  const [showErrors, setShowErrors] = useState(false);
  const edit = (changes: Partial<Form>) => setForm((current) => ({ ...current, ...changes }));

  const fee = Number(form.fee);
  const retention = Number(form.retentionHours);
  const errors = {
    fee: !/^\d+(\.\d{1,2})?$/.test(form.fee.trim()) || fee < 0.5 || fee > 100 ? "Enter an amount between $0.50 and $100." : undefined,
    radii: form.searchRadii.length === 0 ? "Offer at least one distance." : undefined,
    retention: !Number.isInteger(retention) || retention < 1 || retention > 720 ? "Enter whole hours between 1 and 720." : undefined,
    templates: SMS_TEMPLATES.filter((item) => missingPlaceholders(item.id, form.smsTemplates[item.id]).length > 0).map((item) => item.id),
  };
  const valid = !errors.fee && !errors.radii && !errors.retention && errors.templates.length === 0;
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(saved));
  const missing = missingPlaceholders(template, form.smsTemplates[template]);

  const save = () => {
    setShowErrors(true);
    if (!valid || !account) return;
    platformSettings.save(
      {
        feeCents: Math.round(fee * 100),
        searchRadii: form.searchRadii,
        requirePhoneCode: form.requirePhoneCode,
        retentionHours: retention,
        purgeTime: form.purgeTime,
        smsTemplates: form.smsTemplates,
      },
      account.name,
    );
    setShowErrors(false);
    push("Settings saved. Changes are live.");
  };

  const toggleRadius = (radius: number) =>
    edit({
      searchRadii: form.searchRadii.includes(radius)
        ? form.searchRadii.filter((item) => item !== radius)
        : [...form.searchRadii, radius].sort((a, b) => a - b),
    });

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Settings"
        subtitle={
          saved.updatedAt && saved.updatedBy
            ? `Platform rules. Last changed by ${saved.updatedBy}, ${stamp.format(saved.updatedAt)}.`
            : "Platform rules. Changes are logged and apply straight away."
        }
        action={
          <div className="flex gap-2">
            {dirty ? (
              <Button
                size="lg"
                onClick={() => {
                  setForm(toForm(saved));
                  setShowErrors(false);
                }}
              >
                Discard
              </Button>
            ) : null}
            <Button variant="primary" size="lg" disabled={!dirty} onClick={save}>
              Save changes
            </Button>
          </div>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Service fee" subtitle="Charged once per successful match.">
          <div className="grid gap-4">
            <TextField
              label="Fee per successful match (USD)"
              inputMode="decimal"
              leading={<span className="text-md">$</span>}
              value={form.fee}
              error={showErrors ? errors.fee : undefined}
              onChange={(event) => edit({ fee: event.target.value.replace(/[^\d.]/g, "") })}
            />
            <Notice tone="warn" icon="info">
              The new fee applies to requests posted after you save. Requests already posted keep their fee.
            </Notice>
          </div>
        </Panel>

        <Panel title="Search distance options" subtitle="Distances patients can pick from." delay={40}>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Offered distances">
              {ALL_SEARCH_RADII.map((radius) => {
                const on = form.searchRadii.includes(radius);
                return (
                  <button
                    key={radius}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleRadius(radius)}
                    className={cn(
                      "cursor-pointer rounded-full px-4 py-2 text-md font-semibold ring-1 transition-colors duration-200",
                      on ? "bg-accent text-accent-ink ring-accent" : "text-ink-2 ring-line-strong hover:bg-side-hover",
                    )}
                  >
                    {radius} mi
                  </button>
                );
              })}
            </div>
            {showErrors && errors.radii ? <p className="text-xs font-semibold text-bad">{errors.radii}</p> : null}
            <Checkbox
              checked={form.requirePhoneCode}
              onChange={(requirePhoneCode) => edit({ requirePhoneCode })}
              description="Patients confirm their number with a texted code before the request goes out."
            >
              <span className="font-semibold text-ink">Require phone code before posting</span>
            </Checkbox>
          </div>
        </Panel>

        <Panel title="Data retention" subtitle="When request details are deleted." delay={80}>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Delete closed requests after (hours)"
                inputMode="numeric"
                value={String(form.retentionHours)}
                error={showErrors ? errors.retention : undefined}
                onChange={(event) => edit({ retentionHours: Number(event.target.value.replace(/\D/g, "")) })}
              />
              <Select label="Daily run time" value={form.purgeTime} options={TIME_OPTIONS} onChange={(purgeTime) => edit({ purgeTime })} />
            </div>
            <Notice tone="accent" icon="shieldCheck">
              Anonymized transaction records are never deleted. Patient names and numbers go with the request.
            </Notice>
          </div>
        </Panel>

        <Panel title="Text message templates" subtitle="What patients receive by SMS." className="lg:col-span-2 xl:col-span-3" delay={120}>
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="grid content-start gap-1">
              {SMS_TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTemplate(item.id)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-[12px] px-3 py-2.5 text-left text-md font-semibold transition-colors",
                    template === item.id ? "bg-accent-soft text-accent-text" : "text-ink-2 hover:bg-side-hover",
                  )}
                >
                  {item.label}
                  {errors.templates.includes(item.id) ? <span className="size-2 rounded-full bg-bad" aria-label="Has a problem" /> : null}
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              <Textarea
                label={SMS_TEMPLATES.find((item) => item.id === template)?.label}
                rows={4}
                value={form.smsTemplates[template]}
                error={missing.length ? `Keep ${missing.map((name) => `{${name}}`).join(", ")} in this text.` : undefined}
                onChange={(event) => edit({ smsTemplates: { ...form.smsTemplates, [template]: event.target.value } })}
              />
              <p className="text-sm text-muted">
                Keep the {"{placeholders}"}. Links are added after the text automatically. Never put a medication name in a text.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
