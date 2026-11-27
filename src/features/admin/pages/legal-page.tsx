import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { HtmlEditor } from "@/features/admin/components/html-editor";
import { platformSettings } from "@/features/platform/platform-settings";
import { useToast } from "@/lib/toast";

/** Privacy Policy and Terms, edited as HTML and shown in the patient sheet. */
export function LegalPage() {
  const saved = platformSettings.use();
  const account = adminAuth.useAccount();
  const { push } = useToast();
  const [params] = useSearchParams();
  const tab = params.get("doc") === "terms" ? "terms" : "privacy";
  const [privacy, setPrivacy] = useState(saved.privacyText);
  const [terms, setTerms] = useState(saved.termsText);
  const [editorKey, setEditorKey] = useState(0);
  const dirty = privacy !== saved.privacyText || terms !== saved.termsText;

  const save = () => {
    if (!account) return;
    const { updatedAt: _at, updatedBy: _by, ...rest } = saved;
    platformSettings.save({ ...rest, privacyText: privacy, termsText: terms }, account.name);
    push("Legal pages saved. Patients see them straight away.");
  };

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Privacy & terms"
        subtitle="Shown in a sheet on the patient site. Patients stay on the page they were on."
        action={
          <div className="flex gap-2">
            {dirty ? (
              <Button
                size="lg"
                onClick={() => {
                  setPrivacy(saved.privacyText);
                  setTerms(saved.termsText);
                  setEditorKey((key) => key + 1);
                }}
              >
                Discard
              </Button>
            ) : null}
            <Button variant="primary" size="lg" disabled={!dirty} onClick={save}>
              Save
            </Button>
          </div>
        }
      />
      <SegmentedTabs
        label="Legal document"
        activeKey={tab}
        items={[
          { key: "privacy", label: "Privacy Policy", to: "?doc=privacy" },
          { key: "terms", label: "Terms of Service", to: "?doc=terms" },
        ]}
      />
      {tab === "privacy" ? (
        <HtmlEditor key={`privacy-${editorKey}`} label="Privacy Policy" value={privacy} onChange={setPrivacy} />
      ) : (
        <HtmlEditor key={`terms-${editorKey}`} label="Terms of Service" value={terms} onChange={setTerms} />
      )}
    </div>
  );
}
