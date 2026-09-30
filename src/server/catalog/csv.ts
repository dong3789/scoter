import { nutrientIdentity, normalizeUnit } from "@/server/catalog/aliases";

export type IncomingNutrient = {
  key: string;
  displayName: string;
  amount: number;
  unit: string;
};

export type IncomingProduct = {
  registrationNo: string;
  name: string;
  manufacturer: string | null;
  servingText: string | null;
  nutrients: IncomingNutrient[];
};

export type CsvCatalog = {
  products: IncomingProduct[];
  skippedMissingRegistration: number;
  skippedMissingName: number;
};

const NAME_HEADERS = ["식품명", "제품명"];
const MANUFACTURER_HEADERS = ["제조사명", "제조사", "수입업체명", "유통업체명"];
const REGISTRATION_HEADERS = ["품목제조신고번호", "품목제조번호"];
const SERVING_HEADERS = ["1회분량"];

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

export function productsFromCsv(text: string): CsvCatalog {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { products: [], skippedMissingRegistration: 0, skippedMissingName: 0 };
  }

  const headers = rows[0].map((header) => header.trim());
  const byRegistration = new Map<string, IncomingProduct>();
  let skippedMissingRegistration = 0;
  let skippedMissingName = 0;

  for (const row of rows.slice(1)) {
    const record = recordFrom(headers, row);
    const registrationNo = firstValue(record, REGISTRATION_HEADERS);
    if (!registrationNo) {
      skippedMissingRegistration += 1;
      continue;
    }
    const name = firstValue(record, NAME_HEADERS);
    if (!name) {
      skippedMissingName += 1;
      continue;
    }

    byRegistration.set(registrationNo, {
      registrationNo,
      name,
      manufacturer: firstValue(record, MANUFACTURER_HEADERS),
      servingText: firstValue(record, SERVING_HEADERS),
      nutrients: nutrientsFrom(record),
    });
  }

  return {
    products: [...byRegistration.values()],
    skippedMissingRegistration,
    skippedMissingName,
  };
}

export function nutrientWriteAction(
  existing: { origin: "public" | "user"; locked: boolean } | null,
): "insert" | "update" | "skip" {
  if (!existing) return "insert";
  if (existing.locked || existing.origin === "user") return "skip";
  return "update";
}

export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed || trimmed === "-" || trimmed === "*" || /^tr$/i.test(trimmed)) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount === 0) return null;
  return amount;
}

function recordFrom(headers: string[], row: string[]): Map<string, string> {
  const record = new Map<string, string>();
  headers.forEach((header, index) => {
    if (header) record.set(header, row[index] ?? "");
  });
  return record;
}

function firstValue(record: Map<string, string>, headers: string[]): string | null {
  for (const header of headers) {
    const value = record.get(header)?.trim();
    if (value) return value;
  }
  return null;
}

function nutrientsFrom(record: Map<string, string>): IncomingNutrient[] {
  const nutrients: IncomingNutrient[] = [];
  const seen = new Set<string>();

  for (const [header, raw] of record) {
    const matched = header.match(/^(.+?)\(([^)]+)\)$/);
    if (!matched) continue;
    const amount = parseAmount(raw);
    if (amount === null) continue;
    const identity = nutrientIdentity(matched[1]);
    const unit = normalizeUnit(matched[2]);
    const dedupe = `${identity.key}:${unit}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    nutrients.push({
      key: identity.key,
      displayName: identity.displayName,
      amount,
      unit,
    });
  }

  return nutrients;
}
