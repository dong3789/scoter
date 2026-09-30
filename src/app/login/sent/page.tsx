import { readFile } from "node:fs/promises";

export default async function LoginSentPage() {
  const link = process.env.NODE_ENV === "production" ? null : await readDevLink();

  return (
    <>
      <h1>로그인 링크</h1>
      {link ? (
        <>
          <p>이 주소는 개발 모드에서만 화면에 나옵니다.</p>
          <p>
            <a href={link.url}>{link.email}로 로그인</a>
          </p>
        </>
      ) : (
        <p>메일함에서 로그인 링크를 여세요.</p>
      )}
    </>
  );
}

async function readDevLink() {
  try {
    const text = await readFile("data/dev-magic-link.txt", "utf8");
    const [email, url] = text.trim().split("\n");
    if (!email || !url) return null;
    return { email, url };
  } catch {
    return null;
  }
}
