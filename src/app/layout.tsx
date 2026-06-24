import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import RootShell from "@/components/RootShell";

// Mintlify 디자인 시스템: Inter(UI prose) + Geist Mono(code). DESIGN.md 참조.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap"
});

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
    <html lang="ko" className={`${inter.variable} ${geistMono.variable}`}>
      <body>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
