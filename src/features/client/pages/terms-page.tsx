import { LegalDocument } from "@/components/ui/legal-document";
import { RequestPageFrame } from "@/features/client/components/request-ui";
import { platformSettings } from "@/features/platform/platform-settings";
import { useDocumentTitle } from "@/lib/use-document-title";

export function ClientTermsPage() {
  useDocumentTitle("Terms of Service — FindRx");
  const { termsText } = platformSettings.use();
  return (
    <RequestPageFrame>
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <LegalDocument text={termsText} />
    </RequestPageFrame>
  );
}
