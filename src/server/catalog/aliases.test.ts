import { describe, expect, it } from "vitest";
import { nutrientIdentity } from "@/server/catalog/aliases";

describe("nutrientIdentity", () => {
  it("별칭을 같은 키로 모은다", () => {
    expect(nutrientIdentity("비타민 C").key).toBe("vitamin-c");
    expect(nutrientIdentity("vitamin c").key).toBe("vitamin-c");
    expect(nutrientIdentity("아스코르브산").key).toBe("vitamin-c");
    expect(nutrientIdentity("비타민 D3").key).toBe("vitamin-d");
    expect(nutrientIdentity("마그네슘").key).toBe("magnesium");
    expect(nutrientIdentity("열량").key).toBe("energy");
  });

  it("표에 없는 이름은 공백을 뺀 소문자 키를 쓴다", () => {
    expect(nutrientIdentity("루테인")).toEqual({ key: "루테인", displayName: "루테인" });
    expect(nutrientIdentity("루테인").key).toBe(nutrientIdentity("루테인 ").key);
  });
});
