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
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
    과학: "from-navy-500 to-navy-600",
    빵지순례: "from-gold-400 to-orange-500",
    자연힐링: "from-brand-400 to-brand-600",
    문화예술: "from-gold-400 to-gold-500",
    먹거리: "from-red-400 to-orange-600",
    역사근대: "from-stone-400 to-stone-600",
    축제: "from-orange-400 to-navy-600"
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Sticky header */}
      <div className="border-hairline-soft sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b bg-white px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="뒤로"
          className="rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-ink flex-1 truncate text-sm font-bold">{place.name}</h2>
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
            <h3 className="text-ink text-base leading-snug font-bold">{place.name}</h3>
            <div className="flex shrink-0 items-center gap-0.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
              <span className="text-ink text-sm font-semibold">{place.rating}</span>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="custom" style={{ background: place.bg, color: place.color }}>
              {place.category}
            </Badge>
            <span className="text-stone text-xs">{place.distance}</span>
          </div>
          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1">
            {detail.tags.map((t) => (
              <Badge key={t} tone="neutral">
                #{t}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setFavorited((v) => !v)}
            className={`flex flex-col items-center gap-1 rounded-full border py-2.5 text-xs font-medium transition-colors ${favorited ? "border-red-300 bg-red-50 text-red-600" : "border-hairline text-steel hover:bg-surface-soft"}`}
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
            즐겨찾기
          </button>

          {/* 내 코스에 추가 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setShowCourseDropdown((v) => !v)}
              className={`flex w-full flex-col items-center gap-1 rounded-full border py-2.5 text-xs font-medium transition-colors ${
                showCourseDropdown
                  ? "bg-brand-50 border-brand-300 text-brand-700"
                  : "border-hairline text-steel hover:bg-surface-soft"
              }`}
            >
              <Route className="text-brand-600 h-4 w-4" />내 코스
            </button>
            {showCourseDropdown && (
              <div className="border-hairline absolute top-full left-1/2 z-20 mt-1.5 w-52 -translate-x-1/2 overflow-hidden rounded-lg border bg-white shadow-lg">
                {myCourses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleAddToCourse(course.id, course.title)}
                    className="border-hairline-soft hover:bg-surface-soft flex w-full items-center justify-between border-b px-3 py-2.5 text-left transition-colors last:border-0"
                  >
                    <span className="text-ink truncate text-xs font-medium">{course.title}</span>
                    <span className="text-stone ml-2 shrink-0 text-[10px]">Day 1</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowCourseDropdown(false);
                    router.push("/course/new");
                  }}
                  className="text-brand-600 hover:bg-brand-50 border-hairline-soft flex w-full items-center gap-2 border-t px-3 py-2.5 text-xs font-medium transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />새 코스 만들기
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate?.(place)}
            className="border-hairline text-steel hover:border-navy-300 hover:bg-navy-50 hover:text-navy-600 flex flex-col items-center gap-1 rounded-full border py-2.5 text-xs font-medium transition-colors"
          >
            <Navigation className="text-navy-500 h-4 w-4" />
            경로안내
          </button>
        </div>

        {/* 토스트 */}
        {toast && (
          <div className="bg-ink fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-xs whitespace-nowrap text-white shadow-lg">
            <Check className="text-brand-400 h-3.5 w-3.5 shrink-0" />
            {toast}
          </div>
        )}

        {/* Info */}
        <div className="text-steel space-y-1.5 text-xs">
          <p>
            <span className="text-slate inline-block w-10 font-medium">주소</span>
            {detail.address}
          </p>
          <p>
            <span className="text-slate inline-block w-10 font-medium">시간</span>
            {detail.hours}
          </p>
          <p>
            <span className="text-slate inline-block w-10 font-medium">전화</span>
            {detail.phone}
          </p>
        </div>

        {/* Accessibility */}
        <div>
          <h4 className="text-ink mb-2 text-sm font-semibold">접근성 정보</h4>
          <div className="space-y-2">
            {place.accessibility.map((a) => {
              const info = ACCESSIBILITY_LABELS[a];
              return (
                <div key={a} className="bg-brand-50 flex items-center gap-2 rounded-lg p-2.5">
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
          <h4 className="text-ink mb-2 text-sm font-semibold">상세 내용</h4>
          <p className="text-steel text-sm leading-relaxed">{detail.description}</p>
        </div>

        {/* Reviews */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="text-steel h-4 w-4" />
            <h4 className="text-ink text-sm font-semibold">리뷰</h4>
            <span className="text-stone text-xs">{detail.reviews.length}개</span>
          </div>
          <div className="space-y-3">
            {detail.reviews.map((r) => (
              <div key={r.id} className="border-hairline-soft rounded-lg border p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-ink text-xs font-semibold">{r.user}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < r.rating ? "fill-yellow-400 text-yellow-500" : "text-hairline"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-steel text-xs leading-relaxed">{r.content}</p>
                <p className="text-stone mt-1.5 text-xs">{r.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Report */}
        <div>
          {showReport ? (
            <div className="border-hairline space-y-2 rounded-lg border p-3">
              <p className="text-slate text-xs font-semibold">정보 제보</p>
              <textarea
                placeholder="잘못된 정보나 개선 사항을 알려주세요..."
                className="focus:ring-brand-500 border-hairline w-full resize-none rounded-lg border p-2 text-xs focus:ring-2 focus:outline-none"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReport(false)}
                  className="px-3 py-1.5 text-xs"
                >
                  취소
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => setShowReport(false)}
                  className="px-3 py-1.5 text-xs"
                >
                  제출
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowReport(true)}
              className="w-full py-3 text-sm"
            >
              <Flag className="h-4 w-4" />
              정보 제보
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
