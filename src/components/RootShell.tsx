"use client";

import { useState } from "react";
import { DesktopNav, MobileNav } from "./Navigation";
import AccessibilitySettings from "./AccessibilitySettings";
import Logo from "./Logo";
import { CourseProvider } from "@/context/CourseContext";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const [showAccessibility, setShowAccessibility] = useState(false);

  return (
    <CourseProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 shadow-sm backdrop-blur-md">
          <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
            <Logo />
            <DesktopNav />
            <button
              onClick={() => setShowAccessibility(!showAccessibility)}
              className={`shrink-0 rounded-lg p-2 transition-colors ${showAccessibility ? "bg-brand-50 text-brand-600" : "hover:text-brand-600 text-gray-500 hover:bg-gray-100"}`}
              aria-label="접근성 설정"
              aria-expanded={showAccessibility}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <AccessibilitySettings onClose={() => setShowAccessibility(false)} />
            )}
          </div>
        </header>

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
