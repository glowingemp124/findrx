import { LegalDocument } from "@/components/ui/legal-document";
import { RequestPageFrame } from "@/features/client/components/request-ui";
import { platformSettings } from "@/features/platform/platform-settings";
import { useDocumentTitle } from "@/lib/use-document-title";

export function PrivacyPage() {
  useDocumentTitle("Privacy Policy — FindRx");
  const { privacyText } = platformSettings.use();
  return (
    <RequestPageFrame>
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <LegalDocument text={privacyText} />
    </RequestPageFrame>
  );
}
