import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { PageHeader } from "@/features/pharmacy/components/page-header";
import { usePharmacyWorkspace } from "@/features/pharmacy/hooks/pharmacy-workspace";
import { parseStockFile, stockList } from "@/features/pharmacy/services/stock-list";
import { useToast } from "@/lib/toast";

const SAMPLE = "medication,strength,form,quantity,ndc\nMetformin,500 mg,tablet,60,\nAmoxicillin,400 mg/5 mL,liquid,1,\nLisinopril,10 mg,tablet,90,\nAtorvastatin,20 mg,tablet,30,\n";

const addedOn = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function downloadSample() {
  const file = new Blob([SAMPLE], { type: "text/csv" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "findrx-medications-sample.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/** Private medication list: type one in, or import a CSV. Patients never see it. */
export function MedicationsPage() {
  const { account } = usePharmacyWorkspace();
  const items = stockList.use(account.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [form, setForm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [ndc, setNdc] = useState("");
  const [error, setError] = useState("");
  const { push } = useToast();

  const save = (event: FormEvent) => {
    event.preventDefault();
    const next = name.trim();
    if (next.length < 2) {
      setError("Enter the medication name.");
      return;
    }
    setError("");
    stockList.add(account.id, { name: next, strength, form, quantity, ndc });
    setName("");
    setStrength("");
    setForm("");
    setQuantity("");
    setNdc("");
    push("Medication saved.");
  };

  return (
    <div className="grid gap-6">
      <PageHeader title="Import medications" subtitle="Add one, or upload a CSV." />

      <section className="card grid gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">Import CSV</h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadSample}>Download sample CSV</Button>
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              Upload CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void file.text().then((text) => {
                  const names = parseStockFile(text);
                  stockList.addMany(account.id, names);
                  push(names.length ? `Added ${names.length} medications.` : "No medication names found in that file.");
                });
              }}
            />
          </div>
        </div>
        <pre className="overflow-x-auto rounded-[12px] bg-side-well px-4 py-3 text-sm text-ink-2">{SAMPLE.trim()}</pre>
      </section>

      <section className="card grid gap-4 p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-tight">Add a medication</h2>
        <form noValidate onSubmit={save} className="grid gap-3">
          <TextField label="Medication" value={name} error={error} placeholder="Metformin" onChange={(event) => setName(event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Strength (optional)" value={strength} placeholder="500 mg" onChange={(event) => setStrength(event.target.value)} />
            <TextField label="Form (optional)" value={form} placeholder="Tablet" onChange={(event) => setForm(event.target.value)} />
            <TextField label="Quantity (optional)" value={quantity} placeholder="60" onChange={(event) => setQuantity(event.target.value)} />
            <TextField label="NDC (optional)" value={ndc} placeholder="0002-1433-80" onChange={(event) => setNdc(event.target.value)} />
          </div>
          <Button type="submit" variant="primary" className="h-11 w-full sm:w-auto">
            Save
          </Button>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold tracking-tight">On your shelf</h2>
          <p className="mt-1 text-sm text-muted">{items.length === 1 ? "1 medication" : `${items.length} medications`}</p>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-8 text-md text-muted">Nothing saved yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-md">
              <thead className="text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-semibold">Medication</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Added</th>
                  <th className="px-5 py-3 text-right font-semibold"> </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted">{[item.strength, item.form, item.quantity, item.ndc].filter(Boolean).join(" · ") || "—"}</p>
                    </td>
                    <td className="hidden px-5 py-3 text-muted sm:table-cell">{addedOn.format(item.addedAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" onClick={() => stockList.remove(account.id, item.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
