"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Star,
  Heart,
  Route,
  Navigation,
  Flag,
  MessageCircle,
  Plus,
  Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PLACE_DETAILS, ACCESSIBILITY_LABELS, type Place } from "@/data/placesData";
import { useCourseContext } from "@/context/CourseContext";

export default function PlaceDetailPanel({
  place,
  onBack,
  onNavigate
}: {
  place: Place;
  onBack: () => void;
  onNavigate?: (place: Place) => void;
}) {
  const [favorited, setFavorited] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const detail = PLACE_DETAILS[place.id];
  const { myCourses, addPlaceToCourse } = useCourseContext();
  const router = useRouter();

  const handleAddToCourse = (courseId: number, courseTitle: string) => {
    addPlaceToCourse(courseId, place.name);
    setShowCourseDropdown(false);
    setToast(`"${courseTitle}"에 추가됐어요`);
    setTimeout(() => setToast(null), 2500);
  };

  const gradients: Record<string, string> = {
    과학: "from-purple-500 to-indigo-600",
    빵지순례: "from-amber-400 to-orange-500",
    자연힐링: "from-brand-400 to-brand-600",
    문화예술: "from-yellow-400 to-amber-500",
    먹거리: "from-red-400 to-rose-600",
    역사근대: "from-stone-400 to-stone-600",
    축제: "from-pink-400 to-fuchsia-600"
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-2.5">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="flex-1 truncate text-sm font-bold text-gray-800">{place.name}</h2>
      </div>

      {/* Hero image */}
      <div
        className={`h-40 shrink-0 bg-gradient-to-br ${gradients[place.category] ?? "from-brand-400 to-brand-600"} flex items-center justify-center`}
      >
        <span className="text-6xl">{place.emoji}</span>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-5 p-4">
        {/* Title + meta */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base leading-snug font-bold text-gray-900">{place.name}</h3>
            <div className="flex shrink-0 items-center gap-0.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-800">{place.rating}</span>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: place.bg, color: place.color }}
            >
              {place.category}
            </span>
            <span className="text-xs text-gray-400">{place.distance}</span>
          </div>
          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1">
            {detail.tags.map((t) => (
              <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setFavorited((v) => !v)}
            className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-colors ${favorited ? "border-red-300 bg-red-50 text-red-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
            즐겨찾기
          </button>

          {/* 내 코스에 추가 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setShowCourseDropdown((v) => !v)}
              className={`flex w-full flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-colors ${
                showCourseDropdown
                  ? "bg-brand-50 border-brand-300 text-brand-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Route className="text-brand-600 h-4 w-4" />내 코스
            </button>
            {showCourseDropdown && (
              <div className="absolute top-full left-1/2 z-20 mt-1.5 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {myCourses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleAddToCourse(course.id, course.title)}
                    className="flex w-full items-center justify-between border-b border-gray-50 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-gray-50"
                  >
                    <span className="truncate text-xs font-medium text-gray-800">
                      {course.title}
                    </span>
                    <span className="ml-2 shrink-0 text-[10px] text-gray-400">Day 1</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowCourseDropdown(false);
                    router.push("/course/new");
                  }}
                  className="text-brand-600 hover:bg-brand-50 flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-xs font-medium transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />새 코스 만들기
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate?.(place)}
            className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
          >
            <Navigation className="h-4 w-4 text-blue-500" />
            경로안내
          </button>
        </div>

        {/* 토스트 */}
        {toast && (
          <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-xs whitespace-nowrap text-white shadow-lg">
            <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
            {toast}
          </div>
        )}

        {/* Info */}
        <div className="space-y-1.5 text-xs text-gray-600">
          <p>
            <span className="inline-block w-10 font-medium text-gray-700">주소</span>
            {detail.address}
          </p>
          <p>
            <span className="inline-block w-10 font-medium text-gray-700">시간</span>
            {detail.hours}
          </p>
          <p>
            <span className="inline-block w-10 font-medium text-gray-700">전화</span>
            {detail.phone}
          </p>
        </div>

        {/* Accessibility */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-800">접근성 정보</h4>
          <div className="space-y-2">
            {place.accessibility.map((a) => {
              const info = ACCESSIBILITY_LABELS[a];
              return (
                <div key={a} className="bg-brand-50 flex items-center gap-2 rounded-xl p-2.5">
                  <span className="text-lg">{info?.icon}</span>
                  <div>
                    <p className="text-brand-800 text-xs font-semibold">{a}</p>
                    <p className="text-brand-600 text-xs">{info?.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-800">상세 내용</h4>
          <p className="text-sm leading-relaxed text-gray-600">{detail.description}</p>
        </div>

        {/* Reviews */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-800">리뷰</h4>
            <span className="text-xs text-gray-400">{detail.reviews.length}개</span>
          </div>
          <div className="space-y-3">
            {detail.reviews.map((r) => (
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

        {/* Report */}
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
