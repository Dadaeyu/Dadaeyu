"use client";

import { MobileNav } from "./layout/Navigation";
import Header from "./layout/Header";
import { CourseProvider } from "@/context/CourseContext";
import { PlacesProvider } from "@/context/PlacesContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { AuthProvider } from "@/context/AuthContext";
import type { Place, PlaceDetail } from "@/data/placesData";

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
          </CourseProvider>
        </PlacesProvider>
      </AccessibilityProvider>
    </AuthProvider>
  );
}
