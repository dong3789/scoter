import { objectParticle, topicParticle } from "@/domain/format";
import { TIME_IN_SENTENCE, type TimeSlot } from "@/domain/time";

export const MIN_SHARED_NUTRIENTS = 3;
export const PERCENT_COHORT_SIZE = 20;

export type NutrientUse = {
  productId: string;
  key: string;
  displayName: string;
  timeSlot: TimeSlot;
};

export type CohortPerson = {
  userId: string;
  displayName: string;
  items: {
    productId: string;
    productName: string;
    servings: number;
    timeSlot: TimeSlot;
  }[];
  nutrients: NutrientUse[];
};

export type MissingNutrient = {
  key: string;
  displayName: string;
  percent: number;
  sentence: string;
};

export type OnlyMineNutrient = {
  key: string;
  displayName: string;
  sentence: string;
};

export type CohortView = {
  people: CohortPerson[];
  showPercents: boolean;
  missing: MissingNutrient[];
  onlyMine: OnlyMineNutrient[];
};

export function evaluateCohort(me: CohortPerson, others: CohortPerson[]): CohortView {
  const myKeys = keySet(me);
  const people = others.filter((person) => sharedCount(myKeys, keySet(person)) >= MIN_SHARED_NUTRIENTS);
  const showPercents = people.length >= PERCENT_COHORT_SIZE;

  if (!showPercents) {
    return { people, showPercents, missing: [], onlyMine: [] };
  }

  const cohortKeys = new Map<string, number>();
  for (const person of people) {
    for (const key of keySet(person)) {
      cohortKeys.set(key, (cohortKeys.get(key) ?? 0) + 1);
    }
  }

  const missing: MissingNutrient[] = [];
  for (const [key, count] of cohortKeys) {
    if (myKeys.has(key) || count === 0) continue;
    const displayName = preferredName(key, people);
    const percent = Math.round((count / people.length) * 100);
    const time = dominantTime(key, people);
    const when = time ? ` ${TIME_IN_SENTENCE[time]}` : "";
    missing.push({
      key,
      displayName,
      percent,
      sentence: `이 군 ${people.length}명 중 ${percent}%가 ${displayName}${objectParticle(displayName)}${when} 먹는다. 네 스택에는 없다.`,
    });
  }
  missing.sort((a, b) => b.percent - a.percent || a.displayName.localeCompare(b.displayName, "ko"));

  const onlyMine: OnlyMineNutrient[] = [];
  for (const key of myKeys) {
    if ((cohortKeys.get(key) ?? 0) > 0) continue;
    const displayName = preferredName(key, [me]);
    onlyMine.push({
      key,
      displayName,
      sentence: `${displayName}${topicParticle(displayName)} 이 군에서 네 스택에만 있다.`,
    });
  }
  onlyMine.sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));

  return { people, showPercents, missing, onlyMine };
}

function keySet(person: CohortPerson): Set<string> {
  return new Set(person.nutrients.map((nutrient) => nutrient.key));
}

function sharedCount(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const key of left) if (right.has(key)) count += 1;
  return count;
}

function preferredName(key: string, people: CohortPerson[]): string {
  const counts = new Map<string, number>();
  for (const person of people) {
    for (const nutrient of person.nutrients) {
      if (nutrient.key !== key) continue;
      counts.set(nutrient.displayName, (counts.get(nutrient.displayName) ?? 0) + 1);
    }
  }
  let best = key;
  let bestCount = -1;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

function dominantTime(key: string, people: CohortPerson[]): TimeSlot | null {
  const votes = new Map<TimeSlot, number>();
  for (const person of people) {
    const seen = new Set<string>();
    for (const nutrient of person.nutrients) {
      if (nutrient.key !== key) continue;
      const dedupe = `${nutrient.productId}:${nutrient.timeSlot}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      votes.set(nutrient.timeSlot, (votes.get(nutrient.timeSlot) ?? 0) + 1);
    }
  }

  let top: TimeSlot | null = null;
  let topCount = 0;
  let tied = false;
  for (const [time, count] of votes) {
    if (count > topCount) {
      top = time;
      topCount = count;
      tied = false;
    } else if (count === topCount) {
      tied = true;
    }
  }
  if (!top || tied) return null;
  return top;
}
