"use client";

import { MobileNav } from "./layout/Navigation";
import Header from "./layout/Header";
import { CourseProvider } from "@/context/CourseContext";

export default function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <CourseProvider>
      <div className="min-h-screen bg-white">
        <Header />

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </CourseProvider>
  );
}
