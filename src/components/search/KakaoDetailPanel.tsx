"use client";

import { ChevronLeft, MapPin, ExternalLink, Phone } from "lucide-react";
import type { SearchPlace } from "@/lib/search/kakaoSearch";

// ── 카카오 검색 결과 상세 패널 ─────────────────────────────
export default function KakaoDetailPanel({ sp, onBack }: { sp: SearchPlace; onBack: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-2.5">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="flex-1 truncate text-sm font-bold text-gray-800">{sp.name}</h2>
      </div>

      <div className="flex h-40 shrink-0 items-center justify-center bg-gradient-to-br from-cyan-400 to-cyan-600">
        <MapPin className="h-12 w-12 text-white/60" />
      </div>

      <div className="flex-1 space-y-5 p-4">
        {/* 제목 */}
        <div>
          <h3 className="text-base leading-snug font-bold text-gray-900">{sp.name}</h3>
          {sp.category && (
            <p className="mt-1 text-xs text-cyan-600">{sp.category.split(" > ").pop()}</p>
          )}
        </div>

        {/* 기본 정보 */}
        <div className="space-y-1.5 text-xs text-gray-600">
          {[
            { label: "주소", value: sp.address || "-" },
            { label: "전화", value: sp.phone || "-" }
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-2">
              <span className="w-10 shrink-0 font-medium text-gray-700">{label}</span>
              <span className="min-w-0 break-words">{value}</span>
            </div>
          ))}
        </div>

        {sp.phone ? (
          <a
            href={`tel:${sp.phone.replace(/[^\d+]/g, "")}`}
            className="border-brand-200 text-brand-800 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-cyan-50"
          >
            <Phone className="h-4 w-4" />
            전화하기
          </a>
        ) : null}

        {sp.placeUrl && (
          <a
            href={sp.placeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            카카오맵에서 보기
          </a>
        )}

        <div className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">
          외부 검색 결과입니다. 다대유의 무장애 상세정보·후기·즐겨찾기는 등록된 관광지에서만
          제공됩니다.
        </div>
      </div>
    </div>
  );
}
