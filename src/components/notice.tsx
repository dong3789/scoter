import { ERROR_TEXT } from "@/lib/errors";

export function Notice({ code }: { code?: string }) {
  if (!code) return null;
  const message = ERROR_TEXT[code] ?? "요청을 처리하지 못했습니다.";
  return (
    <p className="notice" role="alert">
      {message}
    </p>
  );
}
