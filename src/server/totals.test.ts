import { describe, expect, it } from "vitest";
import { dailyTotals } from "@/server/totals";

describe("dailyTotals", () => {
  it("배수를 곱하고 단위가 다르면 줄을 나눈다", () => {
    const totals = dailyTotals([
      {
        servings: 2,
        nutrients: [
          { key: "magnesium", displayName: "마그네슘", amount: 200, unit: "mg" },
          { key: "vitamin-d", displayName: "비타민 D", amount: 10, unit: "μg" },
        ],
      },
      {
        servings: 1,
        nutrients: [{ key: "magnesium", displayName: "마그네슘", amount: 50, unit: "mg" }],
      },
      {
        servings: 1,
        nutrients: [{ key: "vitamin-d", displayName: "비타민 D", amount: 400, unit: "IU" }],
      },
    ]);

    expect(totals).toEqual([
      { key: "magnesium", displayName: "마그네슘", unit: "mg", amount: 450 },
      { key: "vitamin-d", displayName: "비타민 D", unit: "IU", amount: 400 },
      { key: "vitamin-d", displayName: "비타민 D", unit: "μg", amount: 20 },
    ]);
  });
});
