import type { Metadata } from "next";
import { Header } from "@/components/header";
import { getViewer } from "@/server/viewer";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scoter",
  description: "지금 먹는 영양제를 체크하고, 같은 제품을 먹는 사람의 스택을 봅니다.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header name={viewer?.displayName ?? null} />
        <main>{children}</main>
      </body>
    </html>
  );
}
