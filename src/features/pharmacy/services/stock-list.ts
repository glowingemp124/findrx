import { createPersistentStore } from "@/lib/persistent-store";

export type StockItem = {
  id: string;
  name: string;
  addedAt: number;
  strength: string;
  form: string;
  quantity: string;
  ndc: string;
};

export type StockInput = {
  name: string;
  strength?: string;
  form?: string;
  quantity?: string;
  ndc?: string;
};

const store = createPersistentStore<Record<string, StockItem[]>>("findrx-pharmacy-stock", {});

const normalize = (name: string) => name.trim().replace(/\s+/g, " ");
const clean = (value: string | undefined) => value?.trim() ?? "";

function withDetails(item: StockItem, input: StockInput): StockItem {
  return {
    ...item,
    strength: clean(input.strength) || item.strength,
    form: clean(input.form) || item.form,
    quantity: clean(input.quantity) || item.quantity,
    ndc: clean(input.ndc) || item.ndc,
  };
}

function addNames(current: StockItem[], inputs: StockInput[]) {
  const next = current.map((item) => ({
    ...item,
    strength: item.strength ?? "",
    form: item.form ?? "",
    quantity: item.quantity ?? "",
    ndc: item.ndc ?? "",
  }));
  for (const raw of inputs) {
    const name = normalize(raw.name);
    if (name.length < 2) continue;
    const index = next.findIndex((item) => item.name.toLowerCase() === name.toLowerCase());
    if (index >= 0) {
      next[index] = withDetails(next[index], raw);
      continue;
    }
    next.unshift({
      id: crypto.randomUUID(),
      name,
      addedAt: Date.now(),
      strength: clean(raw.strength),
      form: clean(raw.form),
      quantity: clean(raw.quantity),
      ndc: clean(raw.ndc),
    });
  }
  return next;
}

/** Private shelf list for one pharmacy. FindRx does not show it to patients or other pharmacies. */
export const stockList = {
  use: (pharmacyId: string) => store.use()[pharmacyId] ?? [],

  add(pharmacyId: string, input: StockInput) {
    store.update((all) => ({ ...all, [pharmacyId]: addNames(all[pharmacyId] ?? [], [input]) }));
  },

  addMany(pharmacyId: string, inputs: StockInput[]) {
    store.update((all) => ({ ...all, [pharmacyId]: addNames(all[pharmacyId] ?? [], inputs) }));
  },

  remove(pharmacyId: string, id: string) {
    store.update((all) => ({ ...all, [pharmacyId]: (all[pharmacyId] ?? []).filter((item) => item.id !== id) }));
  },
};

const HEADER = /^(medication|drug|name|product|strength|dose|form|quantity|qty|ndc)$/i;

function cells(line: string) {
  return line.split(",").map((cell) => cell.replaceAll('"', "").trim());
}

/** CSV with a medication column. Strength, form, quantity, and NDC are optional. */
export function parseStockFile(text: string): StockInput[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = cells(lines[0]).map((cell) => cell.toLowerCase());
  const named = header.some((cell) => HEADER.test(cell));
  const index = (labels: string[]) => header.findIndex((cell) => labels.includes(cell));
  const pick = (parts: string[], labels: string[], fallback: number) => {
    const at = named ? index(labels) : -1;
    return (at >= 0 ? parts[at] : !named && fallback === 0 ? parts[0] : named ? "" : "") ?? "";
  };
  return lines.slice(named ? 1 : 0).flatMap((line) => {
    const parts = cells(line);
    const name = named ? (parts[index(["medication", "drug", "name", "product"])] ?? parts[0] ?? "") : (parts[0] ?? "");
    if (name.length < 2 || HEADER.test(name)) return [];
    return [{
      name,
      strength: pick(parts, ["strength", "dose"], 1),
      form: pick(parts, ["form"], 2),
      quantity: pick(parts, ["quantity", "qty"], 3),
      ndc: pick(parts, ["ndc"], 4),
    }];
  });
}

export function matchesStock(medication: string, items: StockItem[]) {
  const med = medication.trim().toLowerCase();
  if (med.length < 3) return false;
  return items.some((item) => {
    const name = item.name.toLowerCase();
    return name === med || med.includes(name) || name.includes(med);
  });
}
