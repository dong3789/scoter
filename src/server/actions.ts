"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { productNutrients, products, questions, stackItems, users } from "@/db/schema";
import { isTimeSlot } from "@/domain/time";
import { nutrientIdentity, normalizeUnit } from "@/server/catalog/aliases";
import { canDeleteQuestion, normalizeQuestion, parseServings } from "@/server/questions";
import { getViewer } from "@/server/viewer";

function back(path: string, code: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${code}`);
}

async function requireNamedUser(returnPath: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(returnPath)}`);
  if (!viewer.displayName) back("/me", "name");
  return viewer;
}

export async function setDisplayName(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?callbackUrl=/me");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if ([...displayName].length < 1 || [...displayName].length > 30) back("/me", "name");
  await db.update(users).set({ displayName, name: displayName }).where(eq(users.id, viewer.id));
  revalidatePath("/");
  redirect("/me");
}

export async function setStackPublic(formData: FormData) {
  const viewer = await requireNamedUser("/me");
  const stackPublic = formData.get("stackPublic") === "on";
  await db.update(users).set({ stackPublic }).where(eq(users.id, viewer.id));
  revalidatePath("/");
  revalidatePath(`/stacks/${viewer.id}`);
  redirect("/me");
}

export async function checkProduct(formData: FormData) {
  const viewer = await requireNamedUser("/me");
  const productId = String(formData.get("productId") ?? "");
  const servings = parseServings(String(formData.get("servings") ?? "1"));
  const timeSlot = String(formData.get("timeSlot") ?? "");
  const query = String(formData.get("q") ?? "");
  const returnPath = query ? `/me?q=${encodeURIComponent(query)}` : "/me";
  if (!servings) back(returnPath, "servings");
  if (!isTimeSlot(timeSlot)) back(returnPath, "time");

  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) back(returnPath, "product");

  await db
    .insert(stackItems)
    .values({ userId: viewer.id, productId, servings, timeSlot })
    .onConflictDoUpdate({
      target: [stackItems.userId, stackItems.productId],
      set: { servings, timeSlot, updatedAt: new Date() },
    });

  revalidatePath("/");
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/stacks/${viewer.id}`);
  redirect(returnPath);
}

export async function uncheckProduct(formData: FormData) {
  const viewer = await requireNamedUser("/me");
  const productId = String(formData.get("productId") ?? "");
  await db.delete(stackItems).where(and(eq(stackItems.userId, viewer.id), eq(stackItems.productId, productId)));
  revalidatePath("/");
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/stacks/${viewer.id}`);
  redirect("/me");
}

export async function addProduct(formData: FormData) {
  const viewer = await requireNamedUser("/me");
  const name = String(formData.get("name") ?? "").trim();
  const manufacturer = String(formData.get("manufacturer") ?? "").trim() || null;
  const servingText = String(formData.get("servingText") ?? "").trim() || null;
  const servings = parseServings(String(formData.get("servings") ?? "1"));
  const timeSlot = String(formData.get("timeSlot") ?? "");
  if (!name) back("/me", "product-name");
  if (!servings) back("/me", "servings");
  if (!isTimeSlot(timeSlot)) back("/me", "time");

  const nutrients = readNutrientFields(formData);
  if (nutrients === "invalid") back("/me", "nutrient");

  const productId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({
        name,
        manufacturer,
        servingText,
        source: "user",
        createdBy: viewer.id,
      })
      .returning({ id: products.id });

    if (nutrients.length > 0) {
      await tx.insert(productNutrients).values(
        nutrients.map((nutrient) => ({
          productId: created.id,
          nutrientKey: nutrient.key,
          displayName: nutrient.displayName,
          amount: nutrient.amount,
          unit: nutrient.unit,
          origin: "user" as const,
          locked: true,
        })),
      );
    }

    await tx.insert(stackItems).values({
      userId: viewer.id,
      productId: created.id,
      servings,
      timeSlot,
    });

    return created.id;
  });

  revalidatePath("/");
  redirect(`/products/${productId}`);
}

export async function addNutrient(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  await requireNamedUser(`/products/${productId}`);
  const parsed = oneNutrient(formData);
  if (!parsed) back(`/products/${productId}`, "nutrient");

  const [existing] = await db
    .select()
    .from(productNutrients)
    .where(
      and(
        eq(productNutrients.productId, productId),
        eq(productNutrients.nutrientKey, parsed.key),
        eq(productNutrients.unit, parsed.unit),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(productNutrients)
      .set({
        displayName: parsed.displayName,
        amount: parsed.amount,
        locked: true,
        origin: existing.origin === "user" ? "user" : existing.origin,
      })
      .where(eq(productNutrients.id, existing.id));
  } else {
    await db.insert(productNutrients).values({
      productId,
      nutrientKey: parsed.key,
      displayName: parsed.displayName,
      amount: parsed.amount,
      unit: parsed.unit,
      origin: "user",
      locked: true,
    });
  }

  revalidatePath(`/products/${productId}`);
  redirect(`/products/${productId}`);
}

export async function correctNutrient(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  await requireNamedUser(`/products/${productId}`);
  const nutrientId = String(formData.get("nutrientId") ?? "");
  const amount = Number(String(formData.get("amount") ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) back(`/products/${productId}`, "nutrient");

  await db
    .update(productNutrients)
    .set({ amount, locked: true })
    .where(and(eq(productNutrients.id, nutrientId), eq(productNutrients.productId, productId)));

  revalidatePath(`/products/${productId}`);
  redirect(`/products/${productId}`);
}

export async function addQuestion(formData: FormData) {
  const stackUserId = String(formData.get("stackUserId") ?? "");
  const viewer = await requireNamedUser(`/stacks/${stackUserId}`);
  const parsed = normalizeQuestion(String(formData.get("body") ?? ""));
  if (!parsed.ok) back(`/stacks/${stackUserId}`, "question");

  const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.id, stackUserId)).limit(1);
  if (!owner) redirect("/");

  await db.insert(questions).values({
    stackUserId,
    authorId: viewer.id,
    body: parsed.body,
  });

  revalidatePath(`/stacks/${stackUserId}`);
  redirect(`/stacks/${stackUserId}`);
}

export async function deleteQuestion(formData: FormData) {
  const stackUserId = String(formData.get("stackUserId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const viewer = await requireNamedUser(`/stacks/${stackUserId}`);
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question || !canDeleteQuestion(viewer, { authorId: question.authorId })) {
    back(`/stacks/${stackUserId}`, "delete");
  }

  await db.delete(questions).where(eq(questions.id, questionId));
  revalidatePath(`/stacks/${stackUserId}`);
  redirect(`/stacks/${stackUserId}`);
}

function readNutrientFields(formData: FormData) {
  const nutrients: { key: string; displayName: string; amount: number; unit: string }[] = [];
  for (let index = 1; index <= 3; index += 1) {
    const name = String(formData.get(`nutrientName${index}`) ?? "").trim();
    const amountRaw = String(formData.get(`amount${index}`) ?? "").trim();
    const unitRaw = String(formData.get(`unit${index}`) ?? "").trim();
    if (!name && !amountRaw && !unitRaw) continue;
    const parsed = nutrientFromParts(name, amountRaw, unitRaw);
    if (!parsed) return "invalid" as const;
    nutrients.push(parsed);
  }
  return nutrients;
}

function oneNutrient(formData: FormData) {
  return nutrientFromParts(
    String(formData.get("nutrientName") ?? ""),
    String(formData.get("amount") ?? ""),
    String(formData.get("unit") ?? ""),
  );
}

function nutrientFromParts(name: string, amountRaw: string, unitRaw: string) {
  const trimmedName = name.trim();
  const amount = Number(amountRaw.trim());
  const unit = normalizeUnit(unitRaw);
  if (!trimmedName || !unit || !Number.isFinite(amount) || amount <= 0) return null;
  const identity = nutrientIdentity(trimmedName);
  return { key: identity.key, displayName: identity.displayName, amount, unit };
}
