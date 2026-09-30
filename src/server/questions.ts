const QUESTION_LIMIT = 200;

export function normalizeQuestion(body: string): { ok: true; body: string } | { ok: false; error: string } {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "질문을 입력하세요." };
  if ([...trimmed].length > QUESTION_LIMIT) return { ok: false, error: "질문은 200자까지입니다." };
  return { ok: true, body: trimmed };
}

export function canDeleteQuestion(
  viewer: { id: string; role: "member" | "admin" },
  question: { authorId: string },
): boolean {
  return viewer.id === question.authorId || viewer.role === "admin";
}

export function parseServings(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function safeCallbackPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/me";
  return value;
}
