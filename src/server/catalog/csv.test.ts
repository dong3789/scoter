import { describe, expect, it } from "vitest";
import { nutrientWriteAction, productsFromCsv } from "@/server/catalog/csv";

const CSV = `식품명,제조사명,품목제조신고번호,1회분량,에너지(kcal),비타민 C(mg),비타민 D(μg),마그네슘(mg)
스코터 비타민C,스코터랩,2026-1,1정,2,500,0,0
번호없음,스코터랩,,1정,1,10,0,0
,스코터랩,2026-9,1정,1,10,0,0
스코터 마그네슘,스코터랩,2026-2,2정,0,0,10,200
스코터 마그네슘 수정,다른랩,2026-2,1정,0,0,10,250
`;

describe("productsFromCsv", () => {
  it("번호가 없는 행은 건너뛰고 같은 번호는 하나로 모은다", () => {
    const parsed = productsFromCsv(CSV);
    expect(parsed.skippedMissingRegistration).toBe(1);
    expect(parsed.skippedMissingName).toBe(1);
    expect(parsed.products).toHaveLength(2);
    const magnesium = parsed.products.find((product) => product.registrationNo === "2026-2");
    expect(magnesium?.name).toBe("스코터 마그네슘 수정");
    expect(magnesium?.nutrients.map((nutrient) => nutrient.key).sort()).toEqual(["magnesium", "vitamin-d"]);
    expect(magnesium?.nutrients.find((nutrient) => nutrient.key === "magnesium")?.amount).toBe(250);
  });

  it("0인 함량은 넣지 않는다", () => {
    const vitamin = productsFromCsv(CSV).products.find((product) => product.registrationNo === "2026-1");
    expect(vitamin?.nutrients.map((nutrient) => nutrient.key).sort()).toEqual(["energy", "vitamin-c"]);
  });
});

describe("nutrientWriteAction", () => {
  it("잠긴 행과 사람이 추가한 행은 유지한다", () => {
    expect(nutrientWriteAction(null)).toBe("insert");
    expect(nutrientWriteAction({ origin: "public", locked: false })).toBe("update");
    expect(nutrientWriteAction({ origin: "public", locked: true })).toBe("skip");
    expect(nutrientWriteAction({ origin: "user", locked: false })).toBe("skip");
  });
});
