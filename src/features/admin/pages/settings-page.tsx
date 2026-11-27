import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  missingPlaceholders,
  platformSettings,
  SMS_TEMPLATES,
  type PlatformSettings,
  type SmsTemplateId,
} from "@/features/platform/platform-settings";
import { cn } from "@/lib/cn";
import { useToast } from "@/lib/toast";
import { useState } from "react";

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
  const maxMiles = Number(form.maxSearchMiles);
  const errors = {
    fee: !/^\d+(\.\d{1,2})?$/.test(form.fee.trim()) || fee < 0 || fee > 100 ? "Enter an amount from $0 to $100. $0 skips payment." : undefined,
    maxMiles: !Number.isInteger(maxMiles) || maxMiles < 5 || maxMiles > 100 ? "Enter a whole number from 5 to 100." : undefined,
    templates: SMS_TEMPLATES.filter((item) => missingPlaceholders(item.id, form.smsTemplates[item.id]).length > 0).map((item) => item.id),
  };
  const valid = !errors.fee && !errors.maxMiles && errors.templates.length === 0;
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(saved));
  const missing = missingPlaceholders(template, form.smsTemplates[template]);

  const save = () => {
    setShowErrors(true);
    if (!valid || !account) return;
    platformSettings.save(
      {
        feeCents: Math.round(fee * 100),
        searchRadii: form.searchRadii,
        maxSearchMiles: maxMiles,
        requirePhoneCode: false,
        retentionHours: form.retentionHours,
        purgeTime: form.purgeTime,
        privacyText: form.privacyText,
        termsText: form.termsText,
        smsTemplates: form.smsTemplates,
      },
      account.name,
    );
    setShowErrors(false);
    push("Settings saved. Changes are live.");
  };

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
              {fee === 0
                ? "At $0, a confirmed request connects straight away. The patient never sees a payment page."
                : "The new fee applies to requests posted after you save. Requests already posted keep their fee."}
            </Notice>
            <TextField
              label="Maximum search distance (miles)"
              inputMode="numeric"
              value={String(form.maxSearchMiles)}
              error={showErrors ? errors.maxMiles : undefined}
              hint="Numbered miles on the patient slider. The last stop is Any, which has no distance limit."
              onChange={(event) => edit({ maxSearchMiles: Number(event.target.value.replace(/\D/g, "")) })}
            />
          </div>
        </Panel>

        <Panel title="Records" subtitle="Requests, claims, and pharmacy actions are kept." delay={80}>
          <Notice tone="accent" icon="shieldCheck">
            Patient requests stay available so someone can look them up with their phone number. Pharmacy claims and reports stay available so you can see who accepts work and then doesn't furnish it.
          </Notice>
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
