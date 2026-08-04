"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MobileNav } from "./layout/Navigation";
import Header from "./layout/Header";
import { CourseProvider } from "@/context/CourseContext";
import { PlacesProvider } from "@/context/PlacesContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { AuthProvider } from "@/context/AuthContext";
import { prefetchFilterOptions } from "@/lib/filterOptions";
import type { Place, PlaceDetail } from "@/data/placesData";
import NoticeModal, {
  getTodayKey,
  snoozeStorageKey,
  type ActiveNotice
} from "@/components/NoticeModal";

export default function RootShell({
  children,
  places,
  placeDetails,
  fromDb
}: {
  children: React.ReactNode;
  places?: Place[];
  placeDetails?: Record<number, PlaceDetail>;
  fromDb?: boolean;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [activeNotice, setActiveNotice] = useState<ActiveNotice | null>(null);

  // 브라우저 첫 진입 시 지도 필터 옵션(접근성/테마)을 미리 받아 전역 캐시에 저장.
  useEffect(() => {
    prefetchFilterOptions();
  }, []);

  useEffect(() => {
    if (!isHomePage) {
      setActiveNotice(null);
      return;
    }

    let cancelled = false;

    fetch("/api/notices/active")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json().catch(() => null)) as { notice?: ActiveNotice | null } | null;
      })
      .then((json) => {
        if (cancelled) return;
        const notice = json?.notice ?? null;
        if (!notice) return;

        try {
          const snooze = localStorage.getItem(snoozeStorageKey(notice.id));
          if (snooze && snooze === getTodayKey()) return;
        } catch {
          // ignore storage errors
        }

        setActiveNotice(notice);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isHomePage]);

  return (
    <AuthProvider>
      <AccessibilityProvider>
        <PlacesProvider initialPlaces={places} initialDetails={placeDetails} fromDb={fromDb}>
          <CourseProvider>
            <div className="min-h-screen bg-white">
              <a
                href="#main"
                className="focus:bg-brand-500 sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
              >
                본문 바로가기
              </a>

              <Header />

              <main id="main" className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-6">
                <div className="mx-auto max-w-7xl">{children}</div>
              </main>

              <MobileNav />
            </div>

            {isHomePage && activeNotice && (
              <NoticeModal
                notice={activeNotice}
                onClose={({ snoozeToday }) => {
                  if (snoozeToday) {
                    try {
                      localStorage.setItem(snoozeStorageKey(activeNotice.id), getTodayKey());
                    } catch {
                      // ignore storage errors
                    }
                  }
                  setActiveNotice(null);
                }}
              />
            )}
          </CourseProvider>
        </PlacesProvider>
      </AccessibilityProvider>
    </AuthProvider>
  );
}
