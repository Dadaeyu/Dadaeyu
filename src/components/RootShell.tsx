"use client";

import { useState } from "react";
import { DesktopNav, MobileNav } from "./Navigation";
import AccessibilitySettings from "./AccessibilitySettings";
import Logo from "./Logo";
import { CourseProvider } from "@/context/CourseContext";
import { PlacesProvider } from "@/context/PlacesContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { AuthProvider } from "@/context/AuthContext";
import type { Place, PlaceDetail } from "@/data/placesData";

export default function RootShell({
  children,
  places,
  placeDetails,
  fromDb,
}: {
  children: React.ReactNode;
  places?: Place[];
  placeDetails?: Record<number, PlaceDetail>;
  fromDb?: boolean;
}) {
  const [showAccessibility, setShowAccessibility] = useState(false);

  return (
    <AuthProvider>
      <AccessibilityProvider>
        <PlacesProvider
          initialPlaces={places}
          initialDetails={placeDetails}
          fromDb={fromDb}
        >
          <CourseProvider>
          <div className="min-h-screen bg-gray-50">
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-100 focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-lg focus:font-semibold"
            >
              본문 바로가기
            </a>

            <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-200/70 shadow-sm">
              <div className="relative max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
                <Logo />
                <DesktopNav />
                <button
                  type="button"
                  onClick={() => setShowAccessibility(!showAccessibility)}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    showAccessibility
                      ? "bg-brand-50 text-brand-600"
                      : "text-gray-500 hover:bg-gray-100 hover:text-brand-600"
                  }`}
                  aria-label="접근성 설정"
                  aria-expanded={showAccessibility}
                  aria-haspopup="dialog"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                {showAccessibility && (
                  <AccessibilitySettings
                    onClose={() => setShowAccessibility(false)}
                  />
                )}
              </div>
            </header>

            <main
              id="main"
              className="flex-1 px-4 md:px-6 py-6 pb-24 md:pb-6"
            >
              <div className="max-w-7xl mx-auto">{children}</div>
            </main>

            <MobileNav />
          </div>
        </CourseProvider>
      </PlacesProvider>
    </AccessibilityProvider>
    </AuthProvider>
  );
}
