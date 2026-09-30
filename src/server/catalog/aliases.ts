export type NutrientIdentity = {
  key: string;
  displayName: string;
};

const ALIASES: Record<string, NutrientIdentity> = {
  비타민c: { key: "vitamin-c", displayName: "비타민 C" },
  vitaminc: { key: "vitamin-c", displayName: "비타민 C" },
  "vitamin-c": { key: "vitamin-c", displayName: "비타민 C" },
  아스코르브산: { key: "vitamin-c", displayName: "비타민 C" },
  비타민d: { key: "vitamin-d", displayName: "비타민 D" },
  비타민d3: { key: "vitamin-d", displayName: "비타민 D" },
  vitamind: { key: "vitamin-d", displayName: "비타민 D" },
  vitamind3: { key: "vitamin-d", displayName: "비타민 D" },
  "vitamin-d": { key: "vitamin-d", displayName: "비타민 D" },
  "vitamin-d3": { key: "vitamin-d", displayName: "비타민 D" },
  마그네슘: { key: "magnesium", displayName: "마그네슘" },
  magnesium: { key: "magnesium", displayName: "마그네슘" },
  칼슘: { key: "calcium", displayName: "칼슘" },
  calcium: { key: "calcium", displayName: "칼슘" },
  철: { key: "iron", displayName: "철" },
  iron: { key: "iron", displayName: "철" },
  열량: { key: "energy", displayName: "열량" },
  에너지: { key: "energy", displayName: "열량" },
  energy: { key: "energy", displayName: "열량" },
};

export function compactNutrientName(raw: string): string {
  return raw.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");
}

export function nutrientIdentity(raw: string): NutrientIdentity {
  const compact = compactNutrientName(raw);
  const alias = ALIASES[compact];
  if (alias) return alias;
  return { key: compact, displayName: raw.trim() };
}

export function normalizeUnit(unit: string): string {
  const compact = unit.normalize("NFKC").trim();
  if (/^(μg|µg|ug|mcg|㎍)$/i.test(compact)) return "μg";
  if (/^kcal$/i.test(compact)) return "kcal";
  return compact;
}
