import { logout } from "@/app/login/actions";

export function Header({ name }: { name: string | null }) {
  return (
    <header className="site-header">
      <a className="wordmark" href="/">
        Scoter
      </a>
      <nav>
        {name ? (
          <>
            <a href="/me">내 스택</a>
            <a href="/me/cohort">겹치는 스택</a>
            <form action={logout}>
              <button type="submit">로그아웃</button>
            </form>
          </>
        ) : (
          <a href="/login">로그인</a>
        )}
      </nav>
    </header>
  );
}
