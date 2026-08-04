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

function isSnoozedToday(noticeId: number): boolean {
  try {
    const snooze = localStorage.getItem(snoozeStorageKey(noticeId));
    return !!snooze && snooze === getTodayKey();
  } catch {
    return false;
  }
}

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
  const [queue, setQueue] = useState<ActiveNotice[]>([]);

  // 브라우저 첫 진입 시 지도 필터 옵션(접근성/테마)을 미리 받아 전역 캐시에 저장.
  useEffect(() => {
    prefetchFilterOptions();
  }, []);

  useEffect(() => {
    if (!isHomePage) {
      queueMicrotask(() => setQueue([]));
      return;
    }

    let cancelled = false;

    fetch("/api/notices/active")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json().catch(() => null)) as { notices?: ActiveNotice[] } | null;
      })
      .then((json) => {
        if (cancelled) return;
        const notices = json?.notices ?? [];
        setQueue(
          notices.filter((notice) => isDisplayableNotice(notice) && !isSnoozedToday(notice.id))
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isHomePage]);

  const currentNotice = queue[0] ?? null;

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

            {isHomePage && currentNotice && (
              <NoticeModal
                key={currentNotice.id}
                notice={currentNotice}
                onClose={({ snoozeToday }) => {
                  if (snoozeToday) {
                    try {
                      localStorage.setItem(snoozeStorageKey(currentNotice.id), getTodayKey());
                    } catch {
                      // ignore storage errors
                    }
                  }
                  setQueue((prev) => prev.slice(1));
                }}
              />
            )}
          </CourseProvider>
        </PlacesProvider>
      </AccessibilityProvider>
    </AuthProvider>
  );
}

function isDisplayableNotice(notice: ActiveNotice) {
  const content = notice.content.replace(/\s+/g, " ").trim();
  if (content.length < 10) return false;
  return !/^(테스트|test|히히)/iu.test(content);
}
