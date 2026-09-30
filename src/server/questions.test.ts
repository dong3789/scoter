import { describe, expect, it } from "vitest";
import { canDeleteQuestion, normalizeQuestion, parseServings } from "@/server/questions";

describe("normalizeQuestion", () => {
  it("공백만 있으면 거절하고 201자를 거절한다", () => {
    expect(normalizeQuestion("  ").ok).toBe(false);
    expect(normalizeQuestion("  저녁에 먹나요?  ")).toEqual({ ok: true, body: "저녁에 먹나요?" });
    expect(normalizeQuestion("가".repeat(201)).ok).toBe(false);
    expect(normalizeQuestion("가".repeat(200)).ok).toBe(true);
  });
});

describe("parseServings", () => {
  it("0 이하는 거절한다", () => {
    expect(parseServings("0")).toBeNull();
    expect(parseServings("-1")).toBeNull();
    expect(parseServings("1.5")).toBe(1.5);
  });
});

describe("canDeleteQuestion", () => {
  it("작성자와 관리자만 지울 수 있다", () => {
    expect(canDeleteQuestion({ id: "a", role: "member" }, { authorId: "a" })).toBe(true);
    expect(canDeleteQuestion({ id: "b", role: "member" }, { authorId: "a" })).toBe(false);
    expect(canDeleteQuestion({ id: "b", role: "admin" }, { authorId: "a" })).toBe(true);
  });
});
