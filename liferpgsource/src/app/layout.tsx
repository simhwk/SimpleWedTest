import type { Metadata } from "next";
import { Gowun_Dodum } from "next/font/google";

import "./globals.css";

// 한글이 예쁘게 나오는 구글 폰트. 게임 UI 느낌에 맞는 살짝 둥근 고딕.
const sansKr = Gowun_Dodum({
  weight: "400",
  variable: "--font-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "내 인생 RPG",
  description: "오늘 할 일이 퀘스트가 된다. 깨면 경험치를 받고 레벨이 오른다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${sansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
