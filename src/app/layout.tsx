import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import RootShell from "@/components/RootShell";
import { fetchPlacesFromDb } from "@/lib/supabase/places";
import { A11Y_STORAGE_KEY } from "@/lib/accessibility";

export const metadata: Metadata = {
  title: "다대유 - 대전 무장애 여행",
  description:
    "장애물 없이 즐기는 대전 무장애 여행 가이드, 다대유. 맞춤 코스와 커뮤니티, 상세 지도를 제공합니다.",
};

const a11yInitScript = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(A11Y_STORAGE_KEY)});
    if (!raw) return;
    var s = JSON.parse(raw);
    var el = document.documentElement;
    if (s.darkMode) el.classList.add("dark");
    if (s.highContrast) el.classList.add("high-contrast");
    if (s.fontScale) el.style.setProperty("--a11y-scale", String(s.fontScale / 100));
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dbData = await fetchPlacesFromDb();

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Script
          id="a11y-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: a11yInitScript }}
        />
        <RootShell
          places={dbData?.places}
          placeDetails={dbData?.details}
          fromDb={!!dbData}
        >
          {children}
        </RootShell>
      </body>
    </html>
  );
}
