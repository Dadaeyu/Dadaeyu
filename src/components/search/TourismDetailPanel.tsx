"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  Heart,
  Route,
  Navigation,
  ChevronLeft,
  MapPin,
  Flag,
  MessageCircle,
  PenLine
} from "lucide-react";
import { PLACE_DETAILS } from "@/data/placesData";
import type { SearchPlace } from "@/lib/search/kakaoSearch";
import type { TourismDetail } from "@/hooks/usePlaceSearch";
import AccessibilitySection from "./AccessibilitySection";
import { useAuth } from "@/context/AuthContext";
import { isPlaceLiked } from "@/lib/supabase/placeLikes";

// ── 임시 하드코딩 템플릿 (태그 플레이스홀더) ───────────────
const PLACEHOLDER_DETAIL = PLACE_DETAILS[1];

const REVIEW_PREVIEW_LENGTH = 60;
// 리뷰로 취급하는 게시판("후기")의 board_id.
const REVIEW_BOARD_ID = 1;

type PlaceReviewItem = {
  id: number;
  title: string;
  content: string;
  rating: number | null;
  created_at: string;
};

// Tour API 텍스트에 &apos; &quot; 같은 HTML 엔티티가 그대로 섞여 오는 경우가 있어,
// {text}로 렌더링하기 전(=브라우저가 HTML로 파싱해주지 않는 경우) 직접 디코딩해준다.
const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " "
};
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => HTML_ENTITIES[name])
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

// <br> 기준으로 줄바꿈하되, 원문에 섞인 공백/개행까지 살아남아 빈 줄이 생기지 않도록 각 줄을 trim한다.
function renderWithLineBreaks(text: string) {
  const lines = text
    .split(/<br\s*\/?>/gi)
    .map((l) => decodeHtmlEntities(l.trim()))
    .filter(Boolean);
  return lines.flatMap((line, i) => (i === 0 ? [line] : [<br key={i} />, line]));
}

// DB(tb_place) 출처 검색 결과의 상세 패널. usePlaceSearch()의 tourismDetail을 받아 표시한다.
export default function TourismDetailPanel({
  sp,
  detail,
  isLoading,
  onBack,
  onLikeChange
}: {
  sp: SearchPlace;
  detail: TourismDetail | null;
  isLoading: boolean;
  onBack: () => void;
  onLikeChange?: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [loginNotice, setLoginNotice] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviews, setReviews] = useState<PlaceReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const placeId = Number(sp.id);

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    fetch(`/api/tourism/place-reviews?contentId=${encodeURIComponent(sp.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        setReviewTotal(json?.total ?? 0);
        setAverageRating(json?.average_rating ?? null);
        setReviews(json?.reviews ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setReviewTotal(0);
          setAverageRating(null);
          setReviews([]);
        }
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sp.id]);

  const goWriteReview = () => {
    const params = new URLSearchParams({ contentId: sp.id, board: String(REVIEW_BOARD_ID) });
    router.push(`/community/new?${params}`);
  };

  const goMoreReviews = () => {
    const params = new URLSearchParams({
      tab: "board",
      contentId: sp.id,
      boardId: String(REVIEW_BOARD_ID)
    });
    router.push(`/community?${params}`);
  };

  useEffect(() => {
    if (!user) {
      setFavorited(false);
      return;
    }
    let cancelled = false;
    isPlaceLiked(user.id, placeId)
      .then((liked) => {
        if (!cancelled) setFavorited(liked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, placeId]);

  const handleToggleFavorite = async () => {
    if (!user) {
      setLoginNotice(true);
      setTimeout(() => setLoginNotice(false), 2000);
      return;
    }
    const next = !favorited;
    setFavorited(next);
    try {
      const res = await fetch("/api/places/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId })
      });
      const json = (await res.json().catch(() => ({}))) as {
        favorited?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "즐겨찾기 실패");
      if (typeof json.favorited === "boolean") setFavorited(json.favorited);
      onLikeChange?.();
    } catch {
      setFavorited(!next);
    }
  };

  const title = detail?.title ?? sp.name;
  const image = detail?.image ?? sp.image;
  const addr1 = detail?.addr1 || "-";
  const useTime = detail?.use_time || "-";
  const phone = detail?.phone || "-";
  const overview = detail?.overview ? decodeHtmlEntities(detail.overview) : "상세내용이 없습니다";

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
        <h2 className="flex-1 truncate text-sm font-bold text-gray-800">{title}</h2>
      </div>

      {/* 이미지 */}
      {image ? (
        <img src={image} alt={title} className="h-40 w-full shrink-0 object-cover" />
      ) : (
        <div className="from-brand-400 to-brand-600 flex h-40 shrink-0 items-center justify-center bg-gradient-to-br">
          <MapPin className="h-12 w-12 text-white/60" />
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="border-brand-500 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : (
        <div className="flex-1 space-y-5 p-4">
          {/* 제목 + 평점 */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base leading-snug font-bold text-gray-900">{title}</h3>
              <div className="flex shrink-0 items-center gap-0.5">
                <Star
                  className={`h-4 w-4 ${averageRating != null ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                />
                <span className="text-sm font-semibold text-gray-800">
                  {averageRating != null ? averageRating.toFixed(1) : "0"}
                </span>
              </div>
            </div>
            {detail?.category && <p className="mt-0.5 text-xs text-gray-500">{detail.category}</p>}
            {/* <div className="mt-2 flex flex-wrap gap-1">
              {PLACEHOLDER_DETAIL.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  #{t}
                </span>
              ))}
            </div> */}
          </div>

          {/* 액션 버튼 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleToggleFavorite}
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

          {/* 로그인 안내 토스트 */}
          {loginNotice && (
            <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2.5 text-xs whitespace-nowrap text-white shadow-lg">
              로그인 후 이용 가능합니다
            </div>
          )}

          {/* 기본 정보 */}
          <div className="space-y-1.5 text-xs text-gray-600">
            {[
              { label: "주소", value: addr1 },
              { label: "시간", value: useTime },
              { label: "전화", value: phone }
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-2">
                <span className="w-10 shrink-0 font-medium text-gray-700">{label}</span>
                <span className="min-w-0 break-words">{renderWithLineBreaks(value)}</span>
              </div>
            ))}
          </div>

          {/* 접근성 정보 */}
          {detail?.accessibility && detail.accessibility.length > 0 && (
            <AccessibilitySection groups={detail.accessibility} />
          )}

          {/* 상세 내용 (overview) */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-800">상세 내용</h4>
            <p
              className={`text-sm leading-relaxed text-gray-600 ${overviewExpanded ? "" : "line-clamp-5"}`}
            >
              {overview}
            </p>
            {overview !== "상세내용이 없습니다" && (
              <button
                onClick={() => setOverviewExpanded((v) => !v)}
                className="text-brand-600 hover:text-brand-800 mt-1 text-xs transition-colors"
              >
                {overviewExpanded ? "접기 ▲" : "더보기 ▼"}
              </button>
            )}
          </div>

          {/* 리뷰 */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-800">리뷰</h4>
              <span className="text-xs text-gray-400">{reviewTotal}개</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={goWriteReview}
                  className="text-brand-600 hover:text-brand-800 flex items-center gap-1 text-xs font-medium transition-colors"
                >
                  <PenLine className="h-3 w-3" />
                  리뷰 쓰기
                </button>
                {reviewTotal > 0 && (
                  <button
                    onClick={goMoreReviews}
                    className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
                  >
                    더보기
                  </button>
                )}
              </div>
            </div>
            {reviewsLoading ? (
              <p className="py-4 text-center text-xs text-gray-400">불러오는 중…</p>
            ) : reviews.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">등록된 후기가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/community/${r.id}`)}
                    className="block w-full rounded-xl border border-gray-100 p-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-gray-800">
                        {r.title}
                      </span>
                      {r.rating != null && (
                        <div className="flex shrink-0 items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < r.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-gray-600">
                      {r.content.length > REVIEW_PREVIEW_LENGTH
                        ? `${r.content.slice(0, REVIEW_PREVIEW_LENGTH)}...`
                        : r.content}
                    </p>
                  </button>
                ))}
              </div>
            )}
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
      )}
    </div>
  );
}
