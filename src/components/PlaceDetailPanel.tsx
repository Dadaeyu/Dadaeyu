"use client";

import { useState } from "react";
import { ArrowLeft, Star, Heart, Route, Navigation, Flag, MessageCircle, Plus, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { PLACE_DETAILS, ACCESSIBILITY_LABELS, type Place } from "@/data/placesData";
import { useCourseContext } from "@/context/CourseContext";

export default function PlaceDetailPanel({
  place,
  onBack,
  onNavigate,
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
    축제: "from-pink-400 to-fuchsia-600",
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Sticky header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-bold text-gray-800 truncate flex-1">{place.name}</h2>
      </div>

      {/* Hero image */}
      <div className={`shrink-0 h-40 bg-gradient-to-br ${gradients[place.category] ?? "from-brand-400 to-brand-600"} flex items-center justify-center`}>
        <span className="text-6xl">{place.emoji}</span>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-5">
        {/* Title + meta */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-base leading-snug">{place.name}</h3>
            <div className="flex items-center gap-0.5 shrink-0">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-800">{place.rating}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: place.bg, color: place.color }}>{place.category}</span>
            <span className="text-xs text-gray-400">{place.distance}</span>
          </div>
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {detail.tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">#{t}</span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setFavorited(v => !v)}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${favorited ? "bg-red-50 border-red-300 text-red-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <Heart className={`w-4 h-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
            즐겨찾기
          </button>

          {/* 내 코스에 추가 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setShowCourseDropdown(v => !v)}
              className={`w-full flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                showCourseDropdown ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Route className="w-4 h-4 text-brand-600" />
              내 코스
            </button>
            {showCourseDropdown && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {myCourses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => handleAddToCourse(course.id, course.title)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs font-medium text-gray-800 truncate">{course.title}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">Day 1</span>
                  </button>
                ))}
                <button
                  onClick={() => { setShowCourseDropdown(false); router.push("/course/new"); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-brand-600 font-medium hover:bg-brand-50 transition-colors border-t border-gray-100"
                >
                  <Plus className="w-3.5 h-3.5" />새 코스 만들기
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate?.(place)}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <Navigation className="w-4 h-4 text-blue-500" />
            경로안내
          </button>
        </div>

        {/* 토스트 */}
        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap">
            <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
            {toast}
          </div>
        )}

        {/* Info */}
        <div className="space-y-1.5 text-xs text-gray-600">
          <p><span className="font-medium text-gray-700 w-10 inline-block">주소</span>{detail.address}</p>
          <p><span className="font-medium text-gray-700 w-10 inline-block">시간</span>{detail.hours}</p>
          <p><span className="font-medium text-gray-700 w-10 inline-block">전화</span>{detail.phone}</p>
        </div>

        {/* Accessibility */}
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">접근성 정보</h4>
          <div className="space-y-2">
            {place.accessibility.map(a => {
              const info = ACCESSIBILITY_LABELS[a];
              return (
                <div key={a} className="flex items-center gap-2 p-2.5 bg-brand-50 rounded-xl">
                  <span className="text-lg">{info?.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-brand-800">{a}</p>
                    <p className="text-xs text-brand-600">{info?.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">상세 내용</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{detail.description}</p>
        </div>

        {/* Reviews */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-800">리뷰</h4>
            <span className="text-xs text-gray-400">{detail.reviews.length}개</span>
          </div>
          <div className="space-y-3">
            {detail.reviews.map(r => (
              <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-800">{r.user}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{r.content}</p>
                <p className="text-xs text-gray-400 mt-1.5">{r.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Report */}
        <div>
          {showReport ? (
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">정보 제보</p>
              <textarea
                placeholder="잘못된 정보나 개선 사항을 알려주세요..."
                className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowReport(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">취소</button>
                <button onClick={() => setShowReport(false)}
                  className="text-xs text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors">제출</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowReport(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              <Flag className="w-4 h-4" />
              정보 제보
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
