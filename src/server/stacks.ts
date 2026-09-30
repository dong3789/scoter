import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { productNutrients, products, questions, stackItems, users } from "@/db/schema";
import type { TimeSlot } from "@/domain/time";
import type { CohortPerson } from "@/server/cohort";
import type { TotalSource } from "@/server/totals";

export type StackPreview = {
  userId: string;
  displayName: string;
  updatedAt: Date;
  items: {
    productId: string;
    productName: string;
    servings: number;
    timeSlot: TimeSlot;
  }[];
};

export type StackDetail = {
  userId: string;
  displayName: string | null;
  stackPublic: boolean;
  role: "member" | "admin";
  items: {
    id: string;
    productId: string;
    productName: string;
    manufacturer: string | null;
    servingText: string | null;
    servings: number;
    timeSlot: TimeSlot;
    nutrients: TotalSource["nutrients"];
  }[];
  questions: {
    id: string;
    body: string;
    createdAt: Date;
    authorId: string;
    authorName: string;
  }[];
};

export type ProductRoom = {
  id: string;
  name: string;
  manufacturer: string | null;
  servingText: string | null;
  registrationNo: string | null;
  nutrients: {
    id: string;
    displayName: string;
    amount: number;
    unit: string;
    locked: boolean;
  }[];
  stacks: StackPreview[];
};

const SEARCH_LIMIT = 20;
const HOME_LIMIT = 20;

export function searchPattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function searchProducts(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const pattern = searchPattern(trimmed);
  return db
    .select({
      id: products.id,
      name: products.name,
      manufacturer: products.manufacturer,
      servingText: products.servingText,
      registrationNo: products.registrationNo,
    })
    .from(products)
    .where(
      or(
        sql`${products.name} ilike ${pattern} escape '\\'`,
        sql`${products.manufacturer} ilike ${pattern} escape '\\'`,
      ),
    )
    .limit(SEARCH_LIMIT);
}

export async function listRecentStacks(): Promise<StackPreview[]> {
  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      updatedAt: stackItems.updatedAt,
      productId: products.id,
      productName: products.name,
      servings: stackItems.servings,
      timeSlot: stackItems.timeSlot,
    })
    .from(stackItems)
    .innerJoin(users, eq(users.id, stackItems.userId))
    .innerJoin(products, eq(products.id, stackItems.productId))
    .where(eq(users.stackPublic, true));

  return groupStacks(rows).slice(0, HOME_LIMIT);
}

export async function listMyProductLinks(userId: string) {
  return db
    .select({
      id: products.id,
      name: products.name,
    })
    .from(stackItems)
    .innerJoin(products, eq(products.id, stackItems.productId))
    .where(eq(stackItems.userId, userId))
    .orderBy(products.name);
}

export async function getProductRoom(productId: string): Promise<ProductRoom | null> {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return null;

  const nutrients = await db
    .select({
      id: productNutrients.id,
      displayName: productNutrients.displayName,
      amount: productNutrients.amount,
      unit: productNutrients.unit,
      locked: productNutrients.locked,
    })
    .from(productNutrients)
    .where(eq(productNutrients.productId, productId))
    .orderBy(productNutrients.displayName);

  const members = db
    .select({ userId: stackItems.userId })
    .from(stackItems)
    .innerJoin(users, eq(users.id, stackItems.userId))
    .where(and(eq(stackItems.productId, productId), eq(users.stackPublic, true)));

  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      updatedAt: stackItems.updatedAt,
      productId: products.id,
      productName: products.name,
      servings: stackItems.servings,
      timeSlot: stackItems.timeSlot,
    })
    .from(stackItems)
    .innerJoin(users, eq(users.id, stackItems.userId))
    .innerJoin(products, eq(products.id, stackItems.productId))
    .where(inArray(stackItems.userId, members));

  return {
    id: product.id,
    name: product.name,
    manufacturer: product.manufacturer,
    servingText: product.servingText,
    registrationNo: product.registrationNo,
    nutrients,
    stacks: groupStacks(rows),
  };
}

export async function getStack(userId: string): Promise<StackDetail | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const items = await db
    .select({
      id: stackItems.id,
      productId: products.id,
      productName: products.name,
      manufacturer: products.manufacturer,
      servingText: products.servingText,
      servings: stackItems.servings,
      timeSlot: stackItems.timeSlot,
      nutrientKey: productNutrients.nutrientKey,
      nutrientName: productNutrients.displayName,
      amount: productNutrients.amount,
      unit: productNutrients.unit,
    })
    .from(stackItems)
    .innerJoin(products, eq(products.id, stackItems.productId))
    .leftJoin(productNutrients, eq(productNutrients.productId, products.id))
    .where(eq(stackItems.userId, userId))
    .orderBy(products.name);

  const grouped = new Map<string, StackDetail["items"][number]>();
  for (const row of items) {
    const current = grouped.get(row.id) ?? {
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      manufacturer: row.manufacturer,
      servingText: row.servingText,
      servings: row.servings,
      timeSlot: row.timeSlot as TimeSlot,
      nutrients: [],
    };
    if (row.nutrientKey && row.nutrientName && row.amount !== null && row.unit) {
      current.nutrients.push({
        key: row.nutrientKey,
        displayName: row.nutrientName,
        amount: row.amount,
        unit: row.unit,
      });
    }
    grouped.set(row.id, current);
  }

  const questionRows = await db
    .select({
      id: questions.id,
      body: questions.body,
      createdAt: questions.createdAt,
      authorId: questions.authorId,
      authorName: users.displayName,
    })
    .from(questions)
    .innerJoin(users, eq(users.id, questions.authorId))
    .where(eq(questions.stackUserId, userId))
    .orderBy(questions.createdAt);

  return {
    userId: user.id,
    displayName: user.displayName,
    stackPublic: user.stackPublic,
    role: user.role,
    items: [...grouped.values()],
    questions: questionRows.map((question) => ({
      ...question,
      authorName: question.authorName ?? "이름 없음",
    })),
  };
}

export async function loadCohortPeople(viewerId: string): Promise<{ me: CohortPerson | null; others: CohortPerson[] }> {
  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      stackPublic: users.stackPublic,
      productId: products.id,
      productName: products.name,
      servings: stackItems.servings,
      timeSlot: stackItems.timeSlot,
      nutrientKey: productNutrients.nutrientKey,
      nutrientName: productNutrients.displayName,
    })
    .from(stackItems)
    .innerJoin(users, eq(users.id, stackItems.userId))
    .innerJoin(products, eq(products.id, stackItems.productId))
    .leftJoin(productNutrients, eq(productNutrients.productId, products.id));

  const people = new Map<string, CohortPerson & { stackPublic: boolean }>();
  for (const row of rows) {
    if (!row.displayName) continue;
    const person = people.get(row.userId) ?? {
      userId: row.userId,
      displayName: row.displayName,
      stackPublic: row.stackPublic,
      items: [],
      nutrients: [],
    };
    if (!person.items.some((item) => item.productId === row.productId)) {
      person.items.push({
        productId: row.productId,
        productName: row.productName,
        servings: row.servings,
        timeSlot: row.timeSlot as TimeSlot,
      });
    }
    if (row.nutrientKey && row.nutrientName) {
      person.nutrients.push({
        productId: row.productId,
        key: row.nutrientKey,
        displayName: row.nutrientName,
        timeSlot: row.timeSlot as TimeSlot,
      });
    }
    people.set(row.userId, person);
  }

  const me = people.get(viewerId) ?? null;
  const others = [...people.values()].filter((person) => person.userId !== viewerId && person.stackPublic);
  return {
    me: me ? { userId: me.userId, displayName: me.displayName, items: me.items, nutrients: me.nutrients } : null,
    others,
  };
}

type Row = {
  userId: string;
  displayName: string | null;
  updatedAt: Date;
  productId: string;
  productName: string;
  servings: number;
  timeSlot: string;
};

function groupStacks(rows: Row[]): StackPreview[] {
  const grouped = new Map<string, StackPreview>();
  for (const row of rows) {
    if (!row.displayName) continue;
    const stack = grouped.get(row.userId) ?? {
      userId: row.userId,
      displayName: row.displayName,
      updatedAt: row.updatedAt,
      items: [],
    };
    if (row.updatedAt > stack.updatedAt) stack.updatedAt = row.updatedAt;
    if (!stack.items.some((item) => item.productId === row.productId)) {
      stack.items.push({
        productId: row.productId,
        productName: row.productName,
        servings: row.servings,
        timeSlot: row.timeSlot as TimeSlot,
      });
    }
    grouped.set(row.userId, stack);
  }

  return [...grouped.values()]
    .map((stack) => ({
      ...stack,
      items: stack.items.sort((a, b) => a.productName.localeCompare(b.productName, "ko")),
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

