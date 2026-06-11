"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { DesktopNav } from "./Navigation";
import AccessibilitySettings from "../AccessibilitySettings";
import { Button } from "../ui/Button";

// 상단 헤더 — 로고 + 데스크톱 내비 + 접근성 설정 토글.
export default function Header() {
  const [showAccessibility, setShowAccessibility] = useState(false);

  return (
    <header className="border-hairline sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        {/* 브랜드 로고 — 마크(위치핀+하트) + 워드마크 */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="다대유 - 대전 무장애 여행 홈"
        >
          <span className="bg-brand-500 relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M12 21.5s-6.6-5.6-6.6-10.8A6.6 6.6 0 0 1 12 4.1a6.6 6.6 0 0 1 6.6 6.6c0 5.2-6.6 10.8-6.6 10.8Z"
                fill="white"
              />
              <path
                d="M12 13.9c-1.9-1.4-3.1-2.3-3.1-3.7 0-.95.74-1.7 1.68-1.7.55 0 1.07.27 1.42.69.35-.42.87-.69 1.42-.69.94 0 1.68.75 1.68 1.7 0 1.4-1.2 2.3-3.1 3.7Z"
                fill="#35b597"
              />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight">
              <span className="text-navy-600">다대</span>
              <span className="text-brand-500">유</span>
            </span>
            <span className="text-stone mt-1 text-[10px] font-semibold tracking-tight">
              대전 무장애 여행
            </span>
          </span>
        </Link>
        <DesktopNav />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAccessibility((v) => !v)}
          aria-label="접근성 설정"
          aria-expanded={showAccessibility}
          className={`rounded-full ${
            showAccessibility ? "bg-brand-50 text-brand-600" : "text-steel hover:text-brand-600"
          }`}
        >
          <Settings className="h-6 w-6" />
        </Button>
        {showAccessibility && <AccessibilitySettings onClose={() => setShowAccessibility(false)} />}
      </div>
    </header>
  );
}
