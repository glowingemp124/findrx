import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Icon, type IconName } from "@/components/icons";
import { MedicationChat } from "@/features/client/components/medication-chat";
import { OtpDialog } from "@/features/client/components/otp-dialog";
import { draftStore } from "@/features/client/services/draft-store";
import { platformSettings } from "@/features/platform/platform-settings";
import { requestService } from "@/features/requests/services/request-service";
import { useDocumentTitle } from "@/lib/use-document-title";

const PROMISES: Array<{ icon: IconName; text: string }> = [
  { icon: "shieldCheck", text: "Pharmacies never see your name or number until you connect" },
  { icon: "circleCheck", text: "No account to search. One medication at a time" },
  { icon: "clock", text: "We'll text you. You don't need to add this site to your home screen" },
];

const STEPS = [
  {
    title: "Describe it",
    body: "Answer a few questions in the chat. No account and no medical questions.",
  },
  {
    title: "Pharmacies check",
    body: "Nearby pharmacies see the request and check their shelves. They don't see who you are.",
  },
  {
    title: "Connect when it's found",
    body: "When one confirms, you get a text. Pay the FindRx fee if there is one, then you both get the details.",
  },
  {
    title: "Pick it up",
    body: "Call the pharmacy and finish the prescription with them. Delivery, if you asked for it, is arranged with them.",
  },
];

export function LandingPage() {
  useDocumentTitle("FindRx — Find your medication");
  const navigate = useNavigate();
  const feeCents = platformSettings.use().feeCents;
  const [pending, setPending] = useState<{ id: string; phone: string } | null>(null);

  return (
    <>
      <section className="mx-auto max-w-[1160px] px-4 pt-8 pb-8 sm:px-5 sm:pt-14 sm:pb-10">
        <h1 className="max-w-[680px] text-[clamp(34px,6vw,64px)] leading-[1.06] font-bold tracking-[-0.03em]">
          Get <span onClick={() => navigate("/admin/login")}>your</span> medication, the calm way.
        </h1>
        <p className="mt-3 max-w-[600px] text-lg text-ink-2 sm:mt-5 sm:text-xl">
          Tell FindRx the medication and your area.
          {feeCents === 0
            ? " You connect at no charge once a pharmacy confirms it is on the shelf."
            : " You only pay once a pharmacy confirms it is on the shelf."}
        </p>
        <ul className="mt-5 grid gap-2 sm:mt-7 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2.5">
          {PROMISES.map((promise) => (
            <li key={promise.text} className="flex items-center gap-2 text-md text-ink-2">
              <Icon name={promise.icon} className="size-4 text-accent" />
              {promise.text}
            </li>
          ))}
        </ul>
      </section>

      <section id="request" aria-label="Post a request" className="mx-auto max-w-[760px] scroll-mt-20 px-4 pb-12 sm:px-5 sm:pb-20">
        <MedicationChat
          onPost={(draft) => {
            const { request, needsCode } = requestService.begin(draft);
            if (needsCode) {
              setPending({ id: request.id, phone: draft.phone });
              return;
            }
            draftStore.reset();
            navigate(paths.client.request(request.id));
          }}
        />
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1160px] scroll-mt-20 px-4 pb-12 sm:px-5 sm:pb-20">
        <h2 className="text-3xl font-bold tracking-tight sm:text-[34px]">How FindRx works</h2>
        <ol className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card p-4 sm:p-5">
              <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-md font-bold text-accent-text">{index + 1}</span>
              <h3 className="mt-3 text-xl font-bold tracking-tight">{step.title}</h3>
              <p className="mt-1.5 text-md text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <OtpDialog
        requestId={pending?.id ?? null}
        phone={pending?.phone ?? ""}
        onClose={() => {
          if (pending) requestService.discard(pending.id);
          setPending(null);
        }}
        onVerified={(id) => {
          draftStore.reset();
          navigate(paths.client.request(id));
        }}
      />
    </>
  );
}
