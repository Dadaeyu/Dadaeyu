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
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-200/70 shadow-sm">
          <div className="relative max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            <Logo />
            <DesktopNav />
            <button
              onClick={() => setShowAccessibility(!showAccessibility)}
              className={`p-2 rounded-lg transition-colors shrink-0 ${
                showAccessibility ? "bg-brand-50 text-brand-600" : "text-gray-500 hover:bg-gray-100 hover:text-brand-600"
              }`}
              aria-label="접근성 설정"
              aria-expanded={showAccessibility}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {showAccessibility && (
              <AccessibilitySettings onClose={() => setShowAccessibility(false)} />
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 md:px-6 py-6 pb-24 md:pb-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </CourseProvider>
  );
}
