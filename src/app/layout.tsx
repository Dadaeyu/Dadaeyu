import type { Metadata } from "next";
import "./globals.css";
import RootShell from "@/components/RootShell";

export const metadata: Metadata = {
  title: "다대유 - 대전 무장애 여행",
  description:
    "장애물 없이 즐기는 대전 무장애 여행 가이드, 다대유. 맞춤 코스와 커뮤니티, 상세 지도를 제공합니다."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
