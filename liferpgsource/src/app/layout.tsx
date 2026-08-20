import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";

import "./globals.css";

// 판타지를 걷어냈으니 둥근 게임체도 걷어낸다. 단단하고 담백한 얼굴로.
const sansKr = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600"],
  variable: "--font-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "첫 삽",
  description: "미루던 일을 잘게 쪼개서 시작하게 하고, 시작한 걸 알아줍니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${sansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
