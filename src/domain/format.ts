export function formatQuantity(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded);
}

export function objectParticle(name: string): "을" | "를" {
  return hasBatchim(name) ? "을" : "를";
}

export function topicParticle(name: string): "은" | "는" {
  return hasBatchim(name) ? "은" : "는";
}

function hasBatchim(name: string): boolean {
  const last = [...name.normalize("NFC")].at(-1) ?? "";
  const code = last.codePointAt(0) ?? 0;
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}
