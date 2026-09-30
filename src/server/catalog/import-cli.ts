import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnv();

const fileFlag = process.argv.indexOf("--file");
const file = fileFlag >= 0 ? process.argv[fileFlag + 1] : undefined;

if (!file) {
  console.error("사용법: pnpm import:catalog --file <csv>");
  process.exit(1);
}

const text = readFileSync(resolve(file), "utf8");

import("@/server/catalog/import")
  .then(({ importCatalogText }) => importCatalogText(text))
  .then((stats) => {
    console.log(`건너뜀 (품목제조신고번호 없음): ${stats.skippedMissingRegistration}`);
    console.log(`건너뜀 (제품명 없음): ${stats.skippedMissingName}`);
    console.log(`제품 추가: ${stats.inserted}`);
    console.log(`제품 갱신: ${stats.updated}`);
    console.log(`성분 기록: ${stats.nutrientsWritten}`);
    console.log(`성분 유지 (잠금): ${stats.nutrientsKept}`);
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });

function loadEnv() {
  try {
    const env = readFileSync(resolve(".env"), "utf8");
    for (const line of env.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator);
      const value = trimmed.slice(separator + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Next.js loads .env for the app. The script still runs when DATABASE_URL is already set.
  }
}
