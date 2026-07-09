"use client";

import { useState } from "react";
import {
  Star,
  Heart,
  Route,
  Navigation,
  ChevronLeft,
  MapPin,
  Flag,
  MessageCircle,
  ExternalLink
} from "lucide-react";
import { PLACE_DETAILS } from "@/data/placesData";
import type { SearchPlace } from "@/lib/search/kakaoSearch";

// ── 임시 하드코딩 템플릿 (리뷰·태그 플레이스홀더) ───────────
const PLACEHOLDER_DETAIL = PLACE_DETAILS[1];

// ── 카카오 검색 결과 상세 패널 (임시: DB 상세 정보 없음) ────
export default function KakaoDetailPanel({ sp, onBack }: { sp: SearchPlace; onBack: () => void }) {
  const [favorited, setFavorited] = useState(false);
  const [showReport, setShowReport] = useState(false);

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
        {/* 제목 + 평점 */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base leading-snug font-bold text-gray-900">{sp.name}</h3>
            <div className="flex shrink-0 items-center gap-0.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-800">4.5</span>
            </div>
          </div>
          {sp.category && (
            <p className="mt-1 text-xs text-cyan-600">{sp.category.split(" > ").pop()}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {PLACEHOLDER_DETAIL.tags.map((t) => (
              <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              setFavorited((v) => !v);
            }}
            className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-colors ${
              favorited
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
            즐겨찾기
          </button>
          <button className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">
            <Route className="text-brand-600 h-4 w-4" />내 코스
          </button>
          <button className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600">
            <Navigation className="h-4 w-4 text-blue-500" />
            경로안내
          </button>
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

        {/* 임시: 카카오맵 홈페이지 링크 (DB 상세 정보 연동 전까지) */}
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

        {/* 리뷰 */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-800">리뷰</h4>
            <span className="text-xs text-gray-400">{PLACEHOLDER_DETAIL.reviews.length}개</span>
          </div>
          <div className="space-y-3">
            {PLACEHOLDER_DETAIL.reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-100 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-800">{r.user}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-gray-600">{r.content}</p>
                <p className="mt-1.5 text-xs text-gray-400">{r.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 제보 */}
        <div>
          {showReport ? (
            <div className="space-y-2 rounded-xl border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-700">정보 제보</p>
              <textarea
                placeholder="잘못된 정보나 개선 사항을 알려주세요..."
                className="focus:ring-brand-500 w-full resize-none rounded-lg border border-gray-200 p-2 text-xs focus:ring-2 focus:outline-none"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowReport(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  취소
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className="bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 text-xs text-white transition-colors"
                >
                  제출
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReport(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm text-gray-500 transition-colors hover:bg-gray-50"
            >
              <Flag className="h-4 w-4" />
              정보 제보
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
