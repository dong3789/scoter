import { describe, expect, it } from "vitest";
import { evaluateCohort, type CohortPerson } from "@/server/cohort";
import type { TimeSlot } from "@/domain/time";

const BANNED = ["부족", "결핍", "드세요", "추천합니다", "위험합니다"];

function person(id: string, keys: string[], time: TimeSlot = "bedtime"): CohortPerson {
  return {
    userId: id,
    displayName: id,
    items: keys.map((key) => ({
      productId: `${id}-${key}`,
      productName: key,
      servings: 1,
      timeSlot: time,
    })),
    nutrients: keys.map((key) => ({
      productId: `${id}-${key}`,
      key,
      displayName: key === "magnesium" ? "마그네슘" : key,
      timeSlot: time,
    })),
  };
}

describe("evaluateCohort", () => {
  const me = person("me", ["magnesium", "vitamin-c", "vitamin-d", "iron"]);

  it("성분이 2개 겹치면 군에서 빠지고 3개면 들어온다", () => {
    const view = evaluateCohort(me, [person("two", ["magnesium", "vitamin-c"]), person("three", ["magnesium", "vitamin-c", "vitamin-d"])]);
    expect(view.people.map((entry) => entry.userId)).toEqual(["three"]);
    expect(view.showPercents).toBe(false);
    expect(view.missing).toEqual([]);
  });

  it("19명이면 퍼센트 문장이 없고 20명이면 있다", () => {
    const nineteen = Array.from({ length: 19 }, (_, index) =>
      person(`p${index}`, ["magnesium", "vitamin-c", "vitamin-d", "calcium"], index % 2 === 0 ? "bedtime" : "morning"),
    );
    const under = evaluateCohort(me, nineteen);
    expect(under.people).toHaveLength(19);
    expect(under.showPercents).toBe(false);
    expect(JSON.stringify(under)).not.toContain("%");

    const twenty = evaluateCohort(me, [
      ...nineteen,
      person("p19", ["magnesium", "vitamin-c", "vitamin-d", "calcium"], "bedtime"),
    ]);
    expect(twenty.showPercents).toBe(true);
    const magnesium = twenty.missing.find((nutrient) => nutrient.key === "calcium");
    expect(magnesium?.sentence).toContain("%");
    expect(magnesium?.sentence).toContain("네 스택에는 없다.");
    for (const word of BANNED) {
      expect(twenty.missing.map((nutrient) => nutrient.sentence).join(" ")).not.toContain(word);
      expect(twenty.onlyMine.map((nutrient) => nutrient.sentence).join(" ")).not.toContain(word);
    }
    expect(twenty.onlyMine.map((nutrient) => nutrient.key).sort()).toEqual(["iron"]);
  });

  it("먹는 시간이 동률이면 시간 없이 말한다", () => {
    const people = [
      ...Array.from({ length: 10 }, (_, index) =>
        person(`a${index}`, ["magnesium", "vitamin-c", "vitamin-d", "calcium"], "morning"),
      ),
      ...Array.from({ length: 10 }, (_, index) =>
        person(`b${index}`, ["magnesium", "vitamin-c", "vitamin-d", "calcium"], "bedtime"),
      ),
    ];
    const view = evaluateCohort(person("me", ["vitamin-c", "vitamin-d", "calcium", "iron"]), people);
    const magnesium = view.missing.find((nutrient) => nutrient.key === "magnesium");
    expect(magnesium?.sentence).toBe("이 군 20명 중 100%가 마그네슘을 먹는다. 네 스택에는 없다.");
  });
});
