import { RequestCard, RequestHeading, RequestPageFrame } from "@/features/client/components/request-ui";
import { LegalDocument } from "@/components/ui/legal-document";
import { useDocumentTitle } from "@/lib/use-document-title";

/** Draft wording taken from the product promises in the mockups. Replace with the reviewed legal text. */
const html = `
<h2>What FindRx is</h2>
<p>FindRx is an information service. We pass your Blind Request to participating pharmacies and, when one confirms it has the medication, introduce you to each other. FindRx is not a pharmacy and gives no medical advice.</p>
<h2>The FindRx fee</h2>
<p>You pay one flat fee for the introduction, only after a pharmacy confirms. The medication, any delivery and any insurance are agreed and paid with the pharmacy directly. If you don't pay within the checkout window, nothing is charged.</p>
<h2>What we don't guarantee</h2>
<ul>
  <li>We don't guarantee a pharmacy's stock, price or delivery.</li>
  <li>Your prescription must be checked directly with the pharmacy.</li>
  <li>If a pharmacy didn't have the medication, contact support with your Transaction ID and we'll review a refund.</li>
</ul>
<h2>Your details</h2>
<p>Pharmacies see only the medication, your preferences and a rough distance until you pay. Your name and mobile number go only to the pharmacy you pay. Request details are deleted 24 hours after a request closes.</p>
`;

export function ClientTermsPage() {
  useDocumentTitle("Terms of Service — FindRx");
  return (
    <RequestPageFrame>
      <RequestCard>
        <RequestHeading title="Terms of Service">Please read these terms before paying the FindRx fee.</RequestHeading>
        <LegalDocument html={html} />
      </RequestCard>
    </RequestPageFrame>
  );
}
