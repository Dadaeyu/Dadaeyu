"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Heart,
  MessageCircle,
  ArrowLeft,
  Image as ImageIcon,
  X,
  Megaphone,
  Calendar,
  ChevronDown,
  HelpCircle,
  Pin,
  MapPin,
  Route,
  Search
} from "lucide-react";
import { PLACES, type Place } from "@/data/placesData";
import { useCourseContext, type MyCourse } from "@/context/CourseContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { formatCommunityDate } from "@/lib/community/format";
import { COMMUNITY_DEFAULT_PAGE_SIZE, COMMUNITY_PAGE_SIZES } from "@/lib/pagination";
import { ListPagination } from "@/components/community/ListPagination";
import { useOptionalAuth } from "@/context/AuthContext";
import { requireLoginOrRedirect } from "@/lib/auth/require-login-redirect";
import { CommunityLevelBadge } from "@/components/community/CommunityLevelBadge";

type CommunityNoticeItem = {
  id: number;
  title: string;
  pinned: boolean;
  published_at: string;
};

type CommunityEventItem = {
  id: number;
  title: string;
  summary: string;
  emoji: string;
  badge_label: string;
  badge_color: string;
  cover_gradient: string;
  cover_image_url: string | null;
  period_label: string;
};

type CommunityFaqItem = {
  id: number;
  question: string;
};

type BoardPostItem = {
  id: number;
  title: string;
  post_type: string;
  post_type_label: string;
  author_nickname: string;
  author_community_level?: number;
  like_count: number;
  comment_count: number;
  created_at: string;
};

const typeLabels: Record<string, string> = {
  review: "후기",
  tip: "팁",
  question: "질문",
  share: "공유"
};
// 게시글 타입 → Badge tone (Badge 컴포넌트용)
const typeTone = (type: string): "brand" | "tag" | "orange" | "neutral" =>
  type === "review" ? "brand" : type === "tip" ? "tag" : type === "share" ? "neutral" : "orange";
// 글쓰기 카테고리 선택 버튼의 활성 색 (배지 아닌 토글 버튼용)
const typeBadge = (type: string) =>
  type === "review"
    ? "bg-brand-100 text-brand-700"
    : type === "tip"
      ? "bg-navy-100 text-navy-700"
      : "bg-orange/10 text-orange-deep";

type MainTab = "board" | "notice" | "event" | "faq";

async function parseJsonError(res: Response, fallback: string): Promise<string> {
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return json.error ?? `${fallback} (${res.status})`;
}

function CommunityContentError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border-error/30 text-error flex flex-col gap-3 rounded-lg border bg-red-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
        다시 시도
      </Button>
    </div>
  );
}

function PageSizeSelect({
  value,
  onChange,
  disabled
}: {
  value: number;
  onChange: (size: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="text-steel flex items-center gap-2 text-sm">
      <span className="whitespace-nowrap">표시</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border-hairline bg-background text-ink focus:ring-brand-500 rounded-md border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none"
      >
        {COMMUNITY_PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {n}개씩
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Community() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useOptionalAuth();
  const id = typeof params.id === "string" ? params.id : undefined;
  const initialTab = searchParams.get("tab");
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    if (
      initialTab === "notice" ||
      initialTab === "event" ||
      initialTab === "faq" ||
      initialTab === "board"
    ) {
      return initialTab;
    }
    return "board";
  });
  const [filter, setFilter] = useState<"all" | "review" | "tip" | "question">("all");
  const [boardPosts, setBoardPosts] = useState<BoardPostItem[]>([]);
  const [boardTotal, setBoardTotal] = useState(0);
  const [boardPage, setBoardPage] = useState(0);
  const [boardPageSize, setBoardPageSize] = useState(COMMUNITY_DEFAULT_PAGE_SIZE);
  const [boardQuery, setBoardQuery] = useState("");
  const [boardSearchInput, setBoardSearchInput] = useState("");
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [notices, setNotices] = useState<CommunityNoticeItem[]>([]);
  const [noticeTotal, setNoticeTotal] = useState(0);
  const [noticePage, setNoticePage] = useState(0);
  const [noticePageSize, setNoticePageSize] = useState(COMMUNITY_DEFAULT_PAGE_SIZE);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeError, setNoticeError] = useState<string | null>(null);

  const [events, setEvents] = useState<CommunityEventItem[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventPage, setEventPage] = useState(0);
  const [eventPageSize, setEventPageSize] = useState(COMMUNITY_DEFAULT_PAGE_SIZE);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  const [faqs, setFaqs] = useState<CommunityFaqItem[]>([]);
  const [faqTotal, setFaqTotal] = useState(0);
  const [faqPage, setFaqPage] = useState(0);
  const [faqPageSize, setFaqPageSize] = useState(COMMUNITY_DEFAULT_PAGE_SIZE);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);

  const loadBoardPosts = useCallback(
    async (isCancelled: () => boolean) => {
      setBoardLoading(true);
      setBoardError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(boardPage + 1));
        params.set("pageSize", String(boardPageSize));
        if (boardQuery.trim()) params.set("q", boardQuery.trim());
        if (filter !== "all") params.set("type", filter);

        const res = await fetch(`/api/community/posts?${params}`);
        if (!res.ok) {
          throw new Error(await parseJsonError(res, "게시글을 불러오지 못했습니다"));
        }
        const json = (await res.json()) as {
          items?: BoardPostItem[];
          total?: number;
        };
        if (isCancelled()) return;
        setBoardPosts(json.items ?? []);
        setBoardTotal(json.total ?? 0);
      } catch (e) {
        if (!isCancelled()) {
          setBoardError(e instanceof Error ? e.message : "게시글 로드 실패");
          setBoardPosts([]);
          setBoardTotal(0);
        }
      } finally {
        if (!isCancelled()) setBoardLoading(false);
      }
    },
    [boardPage, boardPageSize, boardQuery, filter]
  );

  const loadNotices = useCallback(
    async (isCancelled: () => boolean) => {
      setNoticeLoading(true);
      setNoticeError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(noticePage + 1));
        params.set("pageSize", String(noticePageSize));
        const res = await fetch(`/api/community/notices?${params}`);
        if (!res.ok) {
          throw new Error(await parseJsonError(res, "공지사항을 불러오지 못했습니다"));
        }
        const json = (await res.json()) as {
          items?: CommunityNoticeItem[];
          total?: number;
        };
        if (isCancelled()) return;
        setNotices(json.items ?? []);
        setNoticeTotal(json.total ?? 0);
      } catch (e) {
        if (!isCancelled()) {
          setNoticeError(e instanceof Error ? e.message : "공지 로드 실패");
          setNotices([]);
          setNoticeTotal(0);
        }
      } finally {
        if (!isCancelled()) setNoticeLoading(false);
      }
    },
    [noticePage, noticePageSize]
  );

  const loadEvents = useCallback(
    async (isCancelled: () => boolean) => {
      setEventLoading(true);
      setEventError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(eventPage + 1));
        params.set("pageSize", String(eventPageSize));
        const res = await fetch(`/api/community/events?${params}`);
        if (!res.ok) {
          throw new Error(await parseJsonError(res, "이벤트를 불러오지 못했습니다"));
        }
        const json = (await res.json()) as {
          items?: CommunityEventItem[];
          total?: number;
        };
        if (isCancelled()) return;
        setEvents(json.items ?? []);
        setEventTotal(json.total ?? 0);
      } catch (e) {
        if (!isCancelled()) {
          setEventError(e instanceof Error ? e.message : "이벤트 로드 실패");
          setEvents([]);
          setEventTotal(0);
        }
      } finally {
        if (!isCancelled()) setEventLoading(false);
      }
    },
    [eventPage, eventPageSize]
  );

  const loadFaqs = useCallback(
    async (isCancelled: () => boolean) => {
      setFaqLoading(true);
      setFaqError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(faqPage + 1));
        params.set("pageSize", String(faqPageSize));
        const res = await fetch(`/api/community/faq?${params}`);
        if (!res.ok) {
          throw new Error(await parseJsonError(res, "FAQ를 불러오지 못했습니다"));
        }
        const json = (await res.json()) as {
          items?: CommunityFaqItem[];
          total?: number;
        };
        if (isCancelled()) return;
        setFaqs(json.items ?? []);
        setFaqTotal(json.total ?? 0);
      } catch (e) {
        if (!isCancelled()) {
          setFaqError(e instanceof Error ? e.message : "FAQ 로드 실패");
          setFaqs([]);
          setFaqTotal(0);
        }
      } finally {
        if (!isCancelled()) setFaqLoading(false);
      }
    },
    [faqPage, faqPageSize]
  );

  useEffect(() => {
    if (id) return;
    const t = setTimeout(() => {
      setBoardQuery(boardSearchInput);
      setBoardPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [boardSearchInput, id]);

  useEffect(() => {
    if (id || mainTab !== "board") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadBoardPosts(() => cancelled);
    });
    return () => {
      cancelled = true;
    };
  }, [id, mainTab, boardPage, boardPageSize, boardQuery, filter, loadBoardPosts]);

  useEffect(() => {
    if (id || mainTab !== "notice") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadNotices(() => cancelled);
    });
    return () => {
      cancelled = true;
    };
  }, [id, mainTab, noticePage, noticePageSize, loadNotices]);

  useEffect(() => {
    if (id || mainTab !== "event") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadEvents(() => cancelled);
    });
    return () => {
      cancelled = true;
    };
  }, [id, mainTab, eventPage, eventPageSize, loadEvents]);

  useEffect(() => {
    if (id || mainTab !== "faq") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadFaqs(() => cancelled);
    });
    return () => {
      cancelled = true;
    };
  }, [id, mainTab, faqPage, faqPageSize, loadFaqs]);

  if (id === "new") return <CommunityWrite />;
  if (id && /^\d+$/.test(id)) return <CommunityDetail id={id} />;

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "board", label: "게시판" },
    { key: "notice", label: "공지사항" },
    { key: "event", label: "이벤트" },
    { key: "faq", label: "FAQ" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-ink text-2xl font-bold">커뮤니티</h1>
        {mainTab === "board" && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => {
              if (!requireLoginOrRedirect(auth?.user, router, "/community/new")) {
                return;
              }
              router.push("/community/new");
            }}
          >
            <Plus className="h-4 w-4" />
            글쓰기
          </Button>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs
        items={mainTabs}
        value={mainTab}
        onValueChange={(k) => setMainTab(k as MainTab)}
        variant="segmented"
      />

      {/* ── 게시판 ── */}
      {mainTab === "board" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                value={boardSearchInput}
                onChange={(e) => setBoardSearchInput(e.target.value)}
                placeholder="제목 검색"
                className="border-hairline bg-background text-ink placeholder:text-stone focus:ring-brand-500 w-full rounded-lg border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
              />
            </div>
            <PageSizeSelect
              value={boardPageSize}
              disabled={boardLoading}
              onChange={(size) => {
                setBoardPageSize(size);
                setBoardPage(0);
              }}
            />
          </div>

          <Tabs
            variant="pill"
            value={filter}
            onValueChange={(k) => {
              setFilter(k as typeof filter);
              setBoardPage(0);
            }}
            items={[
              { key: "all", label: "전체" },
              { key: "review", label: "후기" },
              { key: "tip", label: "팁" },
              { key: "question", label: "질문" }
            ]}
          />

          {boardError && (
            <CommunityContentError
              message={boardError}
              onRetry={() => loadBoardPosts(() => false)}
            />
          )}

          <div className="space-y-3">
            {boardLoading && (
              <Card className="border-hairline-soft text-stone animate-pulse p-6 text-center text-sm">
                불러오는 중…
              </Card>
            )}
            {!boardLoading && !boardError && boardPosts.length === 0 && (
              <Card className="border-hairline-soft p-8 text-center">
                <p className="text-stone text-sm">게시글이 없습니다.</p>
              </Card>
            )}
            {!boardLoading &&
              boardPosts.map((post) => (
                <Card key={post.id} asChild variant="interactive">
                  <Link href={`/community/${post.id}`} className="block">
                    <div className="flex items-start gap-3">
                      <Badge tone={typeTone(post.post_type)} shape="tag" className="shrink-0">
                        {post.post_type_label}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-ink mb-2 truncate font-semibold">{post.title}</h3>
                        <div className="text-steel flex flex-wrap items-center gap-2 text-sm">
                          <CommunityLevelBadge
                            level={post.author_community_level}
                            size="sm"
                            showLabel={false}
                          />
                          <span>{post.author_nickname}</span>
                          <span>{formatCommunityDate(post.created_at)}</span>
                        </div>
                        <div className="text-steel mt-2 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            <span>{post.like_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>{post.comment_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </Card>
              ))}
          </div>

          <ListPagination
            page={boardPage}
            total={boardTotal}
            pageSize={boardPageSize}
            disabled={boardLoading}
            onChange={setBoardPage}
          />
        </div>
      )}

      {/* ── 공지사항 ── */}
      {mainTab === "notice" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <PageSizeSelect
              value={noticePageSize}
              disabled={noticeLoading}
              onChange={(size) => {
                setNoticePageSize(size);
                setNoticePage(0);
              }}
            />
          </div>
          {noticeError ? (
            <CommunityContentError message={noticeError} onRetry={() => loadNotices(() => false)} />
          ) : noticeLoading ? (
            <p className="text-stone text-sm">불러오는 중…</p>
          ) : notices.length === 0 ? (
            <p className="text-stone text-sm">등록된 공지가 없습니다.</p>
          ) : (
            notices.map((notice) => (
              <Link key={notice.id} href={`/community/notice/${notice.id}`}>
                <Card
                  variant="interactive"
                  padding="none"
                  className="flex cursor-pointer items-center gap-3 px-4 py-3.5"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${notice.pinned ? "bg-brand-100" : "bg-surface"}`}
                  >
                    {notice.pinned ? (
                      <Pin className="text-brand-600 fill-brand-600 h-4 w-4" />
                    ) : (
                      <Megaphone className="text-steel h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {notice.pinned && (
                        <span className="bg-brand-500 text-ink shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold">
                          고정
                        </span>
                      )}
                      <h3 className="text-ink truncate font-semibold">{notice.title}</h3>
                    </div>
                    <p className="text-stone mt-0.5 text-xs">
                      {formatCommunityDate(notice.published_at)}
                    </p>
                  </div>
                </Card>
              </Link>
            ))
          )}
          <ListPagination
            page={noticePage}
            total={noticeTotal}
            pageSize={noticePageSize}
            disabled={noticeLoading}
            onChange={setNoticePage}
          />
        </div>
      )}

      {/* ── 이벤트 ── */}
      {mainTab === "event" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <PageSizeSelect
              value={eventPageSize}
              disabled={eventLoading}
              onChange={(size) => {
                setEventPageSize(size);
                setEventPage(0);
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {eventError ? (
              <div className="sm:col-span-2">
                <CommunityContentError
                  message={eventError}
                  onRetry={() => loadEvents(() => false)}
                />
              </div>
            ) : eventLoading ? (
              <p className="text-stone text-sm">불러오는 중…</p>
            ) : events.length === 0 ? (
              <p className="text-stone text-sm">등록된 이벤트가 없습니다.</p>
            ) : (
              events.map((ev) => (
                <Link key={ev.id} href={`/community/event/${ev.id}`}>
                  <Card
                    variant="interactive"
                    padding="none"
                    className="cursor-pointer overflow-hidden"
                  >
                    <div
                      className={`relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br ${ev.cover_gradient}`}
                    >
                      {ev.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ev.cover_image_url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl">{ev.emoji}</span>
                      )}
                    </div>
                    <div className="bg-white p-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        {ev.badge_label ? (
                          <Badge tone="custom" className={`font-semibold ${ev.badge_color}`}>
                            {ev.badge_label}
                          </Badge>
                        ) : (
                          <span />
                        )}
                        <span className="text-stone flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {ev.period_label}
                        </span>
                      </div>
                      <p className="text-ink mb-1 leading-snug font-bold">{ev.title}</p>
                      <p className="text-steel line-clamp-2 text-sm leading-relaxed">
                        {ev.summary}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
          <ListPagination
            page={eventPage}
            total={eventTotal}
            pageSize={eventPageSize}
            disabled={eventLoading}
            onChange={setEventPage}
          />
        </div>
      )}

      {/* ── FAQ ── */}
      {mainTab === "faq" && (
        <div className="space-y-2.5">
          <div className="flex justify-end">
            <PageSizeSelect
              value={faqPageSize}
              disabled={faqLoading}
              onChange={(size) => {
                setFaqPageSize(size);
                setFaqPage(0);
              }}
            />
          </div>
          {faqError ? (
            <CommunityContentError message={faqError} onRetry={() => loadFaqs(() => false)} />
          ) : faqLoading ? (
            <p className="text-stone text-sm">불러오는 중…</p>
          ) : faqs.length === 0 ? (
            <p className="text-stone text-sm">등록된 FAQ가 없습니다.</p>
          ) : (
            faqs.map((faq) => (
              <Link key={faq.id} href={`/community/faq/${faq.id}`}>
                <Card variant="interactive" padding="none" className="overflow-hidden">
                  <div className="hover:bg-surface-soft flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors">
                    <span className="bg-brand-100 text-brand-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                      Q
                    </span>
                    <span className="text-ink flex-1 text-sm font-semibold">{faq.question}</span>
                    <ChevronDown className="text-stone h-4 w-4 shrink-0 -rotate-90" />
                  </div>
                </Card>
              </Link>
            ))
          )}
          <ListPagination
            page={faqPage}
            total={faqTotal}
            pageSize={faqPageSize}
            disabled={faqLoading}
            onChange={setFaqPage}
          />
          <div className="text-stone flex items-center justify-center gap-2 pt-3 text-sm">
            <HelpCircle className="h-4 w-4" />
            <span>원하는 답변이 없나요? 게시판에 질문을 남겨주세요.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 글쓰기 화면 ──────────────────────────────────────────
function CommunityWrite() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const [type, setType] = useState<"review" | "tip" | "question">("review");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const { myCourses } = useCourseContext();
  const [attachedPlaces, setAttachedPlaces] = useState<Place[]>([]);
  const [attachedCourses, setAttachedCourses] = useState<MyCourse[]>([]);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  useEffect(() => {
    if (auth?.loading) return;
    requireLoginOrRedirect(auth?.user, router, "/community/new");
  }, [auth?.loading, auth?.user, router]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    if (!requireLoginOrRedirect(auth?.user, router, "/community/new")) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          post_type: type,
          attached_place_id: attachedPlaces[0]?.id ?? null,
          attached_course_id: attachedCourses[0]?.id ?? null
        })
      });
      const json = (await res.json().catch(() => ({}))) as {
        post?: { id: number };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "등록에 실패했습니다.");
      router.push(json.post?.id ? `/community/${json.post.id}` : "/community");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageAdd = () => {
    // 이미지 첨부 placeholder
    setImages((prev) => [...prev, `photo_${prev.length + 1}`]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/community")}
          aria-label="뒤로"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-ink flex-1 text-xl font-bold">글쓰기</h1>
        <Button
          variant="accent"
          size="sm"
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || submitting}
        >
          {submitting ? "등록 중…" : "등록"}
        </Button>
      </div>

      {submitError && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {submitError}
        </div>
      )}

      {/* 카테고리 선택 */}
      <div>
        <p className="text-slate mb-2 text-sm font-semibold">카테고리</p>
        <div className="flex gap-2">
          {(["review", "tip", "question"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                type === t
                  ? typeBadge(t) + " ring-2 ring-current ring-offset-1"
                  : "bg-surface text-steel hover:bg-hairline"
              }`}
            >
              {typeLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 제목 */}
      <div>
        <p className="text-slate mb-2 text-sm font-semibold">제목</p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
          maxLength={50}
          className="border-hairline bg-background text-ink placeholder:text-stone focus:ring-brand-500 w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
        />
        <p className="text-stone mt-1 text-right text-xs">{title.length}/50</p>
      </div>

      {/* 내용 */}
      <div>
        <p className="text-slate mb-2 text-sm font-semibold">내용</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="여행 후기, 팁, 질문 등 자유롭게 작성해주세요"
          rows={10}
          className="border-hairline bg-background text-ink placeholder:text-stone focus:ring-brand-500 w-full resize-none rounded-lg border px-4 py-3 text-sm leading-relaxed focus:ring-2 focus:outline-none"
        />
        <p className="text-stone mt-1 text-right text-xs">{content.length}자</p>
      </div>

      {/* 이미지 첨부 */}
      <div>
        <p className="text-slate mb-2 text-sm font-semibold">
          사진 첨부 <span className="text-stone font-normal">(선택)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="bg-surface relative h-20 w-20 overflow-hidden rounded-lg">
              <div className="text-stone flex h-full w-full items-center justify-center">
                <ImageIcon aria-hidden="true" className="h-6 w-6" />
              </div>
              <button
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="bg-opacity-60 bg-charcoal absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full"
              >
                <X className="h-2.5 w-2.5 text-white" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              onClick={handleImageAdd}
              className="hover:border-brand-400 hover:text-brand-500 border-hairline text-stone flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed transition-colors"
            >
              <ImageIcon aria-hidden="true" className="h-5 w-5" />
              <span className="text-[10px]">{images.length}/5</span>
            </button>
          )}
        </div>
      </div>

      {/* 장소 · 코스 첨부 */}
      <div>
        <p className="text-slate mb-2 text-sm font-semibold">
          장소 · 코스 첨부 <span className="text-stone font-normal">(선택)</span>
        </p>

        {/* 첨부된 장소 chips */}
        {attachedPlaces.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedPlaces.map((place) => (
              <span
                key={place.id}
                className="bg-brand-50 border-brand-200 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
              >
                <MapPin className="text-brand-600 h-3.5 w-3.5" />
                <span className="text-brand-800 font-medium">{place.name}</span>
                <button
                  onClick={() => setAttachedPlaces((prev) => prev.filter((p) => p.id !== place.id))}
                >
                  <X className="text-brand-400 hover:text-brand-700 h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 첨부된 코스 chips */}
        {attachedCourses.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedCourses.map((course) => (
              <span
                key={course.id}
                className="border-navy-200 bg-navy-50 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
              >
                <Route className="text-navy-600 h-3.5 w-3.5" />
                <span className="text-navy-800 font-medium">{course.title}</span>
                <button
                  onClick={() =>
                    setAttachedCourses((prev) => prev.filter((c) => c.id !== course.id))
                  }
                >
                  <X className="text-navy-400 hover:text-navy-700 h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {/* 장소 추가 */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPlacePicker((v) => !v);
                setShowCoursePicker(false);
              }}
              disabled={attachedPlaces.length >= 3}
              className="border-hairline text-steel hover:bg-surface-soft flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MapPin className="h-4 w-4" />
              장소 추가
            </button>
            {showPlacePicker && (
              <div className="border-hairline absolute top-full left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border bg-white shadow-lg">
                {PLACES.filter((p) => !attachedPlaces.some((ap) => ap.id === p.id)).length === 0 ? (
                  <p className="text-stone px-3 py-3 text-center text-xs">모든 장소가 추가됐어요</p>
                ) : (
                  PLACES.filter((p) => !attachedPlaces.some((ap) => ap.id === p.id)).map(
                    (place) => (
                      <button
                        key={place.id}
                        onClick={() => {
                          setAttachedPlaces((prev) => [...prev, place]);
                          setShowPlacePicker(false);
                        }}
                        className="border-hairline-soft hover:bg-surface-soft flex w-full items-center gap-2.5 border-b px-3 py-2.5 transition-colors last:border-0"
                      >
                        <span className="text-lg">{place.emoji}</span>
                        <div className="text-left">
                          <p className="text-ink text-sm font-medium">{place.name}</p>
                          <p className="text-stone text-xs">{place.category}</p>
                        </div>
                      </button>
                    )
                  )
                )}
              </div>
            )}
          </div>

          {/* 코스 추가 */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCoursePicker((v) => !v);
                setShowPlacePicker(false);
              }}
              disabled={attachedCourses.length >= 3}
              className="border-hairline text-steel hover:bg-surface-soft flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Route className="h-4 w-4" />
              코스 추가
            </button>
            {showCoursePicker && (
              <div className="border-hairline absolute top-full left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border bg-white shadow-lg">
                {myCourses.filter((c) => !attachedCourses.some((ac) => ac.id === c.id)).length ===
                0 ? (
                  <p className="text-stone px-3 py-3 text-center text-xs">추가할 코스가 없어요</p>
                ) : (
                  myCourses
                    .filter((c) => !attachedCourses.some((ac) => ac.id === c.id))
                    .map((course) => (
                      <button
                        key={course.id}
                        onClick={() => {
                          setAttachedCourses((prev) => [...prev, course]);
                          setShowCoursePicker(false);
                        }}
                        className="border-hairline-soft hover:bg-surface-soft flex w-full items-center gap-2.5 border-b px-3 py-2.5 transition-colors last:border-0"
                      >
                        <Route className="text-stone h-4 w-4 shrink-0" />
                        <div className="min-w-0 text-left">
                          <p className="text-ink truncate text-sm font-medium">{course.title}</p>
                          <p className="text-stone text-xs">
                            {course.duration} ·{" "}
                            {course.days.reduce((s, d) => s + d.places.length, 0)}곳
                          </p>
                        </div>
                      </button>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 등록 버튼 (모바일용) */}
      <Button
        variant="accent"
        onClick={handleSubmit}
        disabled={!title.trim() || !content.trim()}
        className="w-full py-3.5 md:hidden"
      >
        등록하기
      </Button>
    </div>
  );
}

// ── 게시글 상세 ──────────────────────────────────────────
type PostDetail = {
  id: number;
  title: string;
  content: string;
  post_type: string;
  post_type_label: string;
  author_nickname: string;
  author_community_level?: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  attached_place_id: number | null;
  attached_course_id: number | null;
  liked?: boolean;
};

type PostComment = {
  id: number;
  content: string;
  created_at: string;
  author_nickname: string;
  author_community_level?: number;
};

function CommunityDetail({ id }: { id: string }) {
  const router = useRouter();
  const auth = useOptionalAuth();
  const { myCourses } = useCourseContext();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const detailPath = `/community/${id}`;

  const loadPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${id}`);
      const json = (await res.json().catch(() => ({}))) as {
        post?: PostDetail;
        comments?: PostComment[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "게시글을 불러오지 못했습니다.");
      setPost(json.post ?? null);
      setComments(json.comments ?? []);
      setLiked(!!json.post?.liked);
      setLikeCount(json.post?.like_count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void loadPost());
  }, [loadPost]);

  const attachedPlace = post?.attached_place_id
    ? PLACES.find((p) => p.id === post.attached_place_id)
    : undefined;
  const attachedCourse = post?.attached_course_id
    ? myCourses.find((c) => c.id === post.attached_course_id)
    : undefined;

  const handleCommentSubmit = async () => {
    if (!comment.trim() || commentBusy) return;
    if (!requireLoginOrRedirect(auth?.user, router, detailPath)) return;
    setCommentBusy(true);
    try {
      const res = await fetch(`/api/community/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment.trim() })
      });
      const json = (await res.json().catch(() => ({}))) as {
        comment?: PostComment;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "댓글 등록에 실패했습니다.");
      if (json.comment) setComments((prev) => [...prev, json.comment!]);
      setComment("");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "댓글 등록 실패");
    } finally {
      setCommentBusy(false);
    }
  };

  const handleToggleLike = async () => {
    if (likeBusy) return;
    if (!requireLoginOrRedirect(auth?.user, router, detailPath)) return;
    setLikeBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch(`/api/community/posts/${id}/likes`, {
        method: next ? "POST" : "DELETE"
      });
      const json = (await res.json().catch(() => ({}))) as {
        liked?: boolean;
        like_count?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "좋아요 처리에 실패했습니다.");
      if (typeof json.liked === "boolean") setLiked(json.liked);
      if (typeof json.like_count === "number") setLikeCount(json.like_count);
    } catch (e) {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      window.alert(e instanceof Error ? e.message : "좋아요 처리 실패");
    } finally {
      setLikeBusy(false);
    }
  };

  if (loading) {
    return <p className="text-stone py-8 text-center text-sm">불러오는 중…</p>;
  }

  if (error || !post) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/community")}>
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Button>
        <CommunityContentError message={error ?? "게시글을 찾을 수 없습니다."} onRetry={loadPost} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/community")}
          aria-label="뒤로"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Badge tone={typeTone(post.post_type)} shape="tag">
          {post.post_type_label}
        </Badge>
      </div>

      {/* Post */}
      <div>
        <h1 className="text-ink mb-3 text-xl font-bold">{post.title}</h1>
        <div className="border-hairline-soft text-steel flex flex-wrap items-center gap-2 border-b pb-4 text-sm">
          <CommunityLevelBadge level={post.author_community_level} size="sm" />
          <span className="text-slate font-medium">{post.author_nickname}</span>
          <span>{formatCommunityDate(post.created_at)}</span>
        </div>
      </div>

      <Card padding="lg">
        <p className="text-slate leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </Card>

      {/* 첨부된 장소 · 코스 */}
      {(attachedPlace || attachedCourse) && (
        <div className="space-y-2">
          <p className="text-stone px-1 text-xs font-semibold">첨부된 장소 · 코스</p>
          {attachedPlace && (
            <button
              onClick={() => router.push(`/map?place=${attachedPlace.id}`)}
              className="border-brand-100 hover:bg-brand-50 hover:border-brand-300 flex w-full items-center gap-3 rounded-full border bg-white p-3.5 text-left transition-colors"
            >
              <span className="shrink-0 text-2xl">{attachedPlace.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm font-semibold">{attachedPlace.name}</p>
                <p className="text-brand-600 mt-0.5 text-xs">지도에서 보기</p>
              </div>
              <MapPin className="text-brand-400 h-4 w-4 shrink-0" />
            </button>
          )}
          {attachedCourse && (
            <button
              onClick={() => router.push(`/course/${attachedCourse.id}`)}
              className="border-navy-100 hover:border-navy-300 hover:bg-navy-50 flex w-full items-center gap-3 rounded-full border bg-white p-3.5 text-left transition-colors"
            >
              <div className="bg-navy-100 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <Route className="text-navy-600 h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm font-semibold">{attachedCourse.title}</p>
                <p className="text-navy-600 mt-0.5 text-xs">코스 상세보기</p>
              </div>
              <ChevronDown className="text-navy-400 h-4 w-4 shrink-0 -rotate-90" />
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={likeBusy}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 transition-colors ${
            liked
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-hairline text-steel hover:bg-surface-soft bg-white"
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          <span className="text-sm">{likeCount}</span>
        </button>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="text-ink font-semibold">댓글 {comments.length}</h3>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-surface-soft rounded-lg p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
                <CommunityLevelBadge level={c.author_community_level} size="sm" showLabel={false} />
                <span className="text-ink font-semibold">{c.author_nickname}</span>
                <span className="text-stone">{formatCommunityDate(c.created_at)}</span>
              </div>
              <p className="text-slate text-sm">{c.content}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleCommentSubmit()}
            placeholder="댓글을 입력하세요"
            className="border-hairline bg-background text-ink placeholder:text-stone focus:ring-brand-500 flex-1 rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
          />
          <Button
            variant="accent"
            onClick={() => void handleCommentSubmit()}
            disabled={!comment.trim() || commentBusy}
            className="px-5 py-3"
          >
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}
