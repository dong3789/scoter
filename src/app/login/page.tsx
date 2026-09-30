import { Notice } from "@/components/notice";
import { safeCallbackPath } from "@/server/questions";
import { requestMagicLink } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl);

  return (
    <>
      <h1>로그인</h1>
      <Notice code={params.error} />
      <form action={requestMagicLink}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label>
          메일
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <button type="submit">로그인 링크 받기</button>
      </form>
    </>
  );
}
