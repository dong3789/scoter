import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productNutrients, products } from "@/db/schema";
import {
  nutrientWriteAction,
  productsFromCsv,
  type IncomingNutrient,
  type IncomingProduct,
} from "@/server/catalog/csv";

export type ImportStats = {
  skippedMissingRegistration: number;
  skippedMissingName: number;
  inserted: number;
  updated: number;
  nutrientsWritten: number;
  nutrientsKept: number;
};

type ExistingNutrient = {
  id: string;
  nutrientKey: string;
  unit: string;
  origin: "public" | "user";
  locked: boolean;
};

export async function importCatalogText(text: string): Promise<ImportStats> {
  const parsed = productsFromCsv(text);
  const stats: ImportStats = {
    skippedMissingRegistration: parsed.skippedMissingRegistration,
    skippedMissingName: parsed.skippedMissingName,
    inserted: 0,
    updated: 0,
    nutrientsWritten: 0,
    nutrientsKept: 0,
  };

  for (const incoming of parsed.products) {
    const outcome = await upsertProduct(incoming);
    stats.inserted += outcome.inserted;
    stats.updated += outcome.updated;
    stats.nutrientsWritten += outcome.nutrientsWritten;
    stats.nutrientsKept += outcome.nutrientsKept;
  }

  return stats;
}

async function upsertProduct(incoming: IncomingProduct) {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.registrationNo, incoming.registrationNo))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(products)
      .values({
        registrationNo: incoming.registrationNo,
        name: incoming.name,
        manufacturer: incoming.manufacturer,
        servingText: incoming.servingText,
        source: "public",
      })
      .returning({ id: products.id });
    const written = await writeNutrients(created.id, incoming.nutrients, []);
    return { inserted: 1, updated: 0, ...written };
  }

  await db
    .update(products)
    .set({
      name: incoming.name,
      manufacturer: incoming.manufacturer,
      servingText: incoming.servingText,
    })
    .where(eq(products.id, existing.id));

  const current = await db
    .select({
      id: productNutrients.id,
      nutrientKey: productNutrients.nutrientKey,
      unit: productNutrients.unit,
      origin: productNutrients.origin,
      locked: productNutrients.locked,
    })
    .from(productNutrients)
    .where(eq(productNutrients.productId, existing.id));

  const written = await writeNutrients(existing.id, incoming.nutrients, current);
  return { inserted: 0, updated: 1, ...written };
}

async function writeNutrients(
  productId: string,
  incoming: IncomingNutrient[],
  existing: ExistingNutrient[],
) {
  let nutrientsWritten = 0;
  let nutrientsKept = 0;

  for (const nutrient of incoming) {
    const match =
      existing.find(
        (row) => row.nutrientKey === nutrient.key && row.unit === nutrient.unit,
      ) ?? null;
    const action = nutrientWriteAction(match);
    if (action === "skip") {
      nutrientsKept += 1;
      continue;
    }
    if (action === "update" && match) {
      await db
        .update(productNutrients)
        .set({
          displayName: nutrient.displayName,
          amount: nutrient.amount,
        })
        .where(eq(productNutrients.id, match.id));
    } else {
      await db.insert(productNutrients).values({
        productId,
        nutrientKey: nutrient.key,
        displayName: nutrient.displayName,
        amount: nutrient.amount,
        unit: nutrient.unit,
        origin: "public",
        locked: false,
      });
    }
    nutrientsWritten += 1;
  }

  return { nutrientsWritten, nutrientsKept };
}
