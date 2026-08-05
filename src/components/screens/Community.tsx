"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Heart,
  MessageCircle,
  Eye,
  ArrowLeft,
  Image as ImageIcon,
  X,
  Megaphone,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pin,
  MapPin,
  Route,
  Search,
  Star,
  Pencil,
  Trash2,
  Paperclip,
  Download
} from "lucide-react";
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

type CommunityBoard = {
  board_id: number;
  board_nm: string;
  rating_yn: boolean;
  allow_image: boolean;
  allow_file: boolean;
  max_upload_count: number;
};

type AttachedFile = { url: string; name: string; size?: number | null };

// 글쓰기 화면의 장소 첨부용 최소 검색 결과 (이름 + 사진만 사용)
type SearchPlaceLite = { id: string; name: string; image: string };

// tb_place 이름 검색(디바운스) — 지도 검색의 복잡한 필터/카카오 병합 없이 이름+사진 목록만 보여준다.
function usePlaceQuickSearch() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchPlaceLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!keyword.trim()) {
      queueMicrotask(() => setResults([]));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    const t = setTimeout(() => {
      fetch(`/api/search?keyword=${encodeURIComponent(keyword.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (!cancelled) setResults(Array.isArray(data) ? data.slice(0, 20) : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [keyword]);

  return { keyword, setKeyword, results, loading };
}

type BoardPostItem = {
  id: number;
  board_id: number;
  board_nm: string;
  title: string;
  writer_nm: string;
  writer_community_level?: number;
  view_cnt: number;
  like_cnt: number;
  comment_cnt: number;
  notice_yn: boolean;
  created_at: string;
};

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
  const initialBoardId = searchParams.get("boardId");
  const [contentIdFilter, setContentIdFilter] = useState<string | null>(
    searchParams.get("contentId")
  );
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
  const [filter, setFilter] = useState<string>(initialBoardId ?? "all");
  const [boards, setBoards] = useState<CommunityBoard[]>([]);
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
        if (filter !== "all") params.set("boardId", filter);
        if (contentIdFilter) params.set("contentId", contentIdFilter);

        const res = await fetch(`/api/community/board-posts?${params}`);
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
    [boardPage, boardPageSize, boardQuery, filter, contentIdFilter]
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
    let cancelled = false;
    fetch("/api/community/boards")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) setBoards((json as { boards?: CommunityBoard[] })?.boards ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

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
  }, [id, mainTab, boardPage, boardPageSize, boardQuery, filter, contentIdFilter, loadBoardPosts]);

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
              const href = filter !== "all" ? `/community/new?board=${filter}` : "/community/new";
              if (!requireLoginOrRedirect(auth?.user, router, href)) {
                return;
              }
              router.push(href);
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
              setFilter(k);
              setBoardPage(0);
            }}
            items={[
              { key: "all", label: "전체" },
              ...boards.map((b) => ({ key: String(b.board_id), label: b.board_nm }))
            ]}
          />

          {contentIdFilter && (
            <div className="bg-brand-50 text-brand-700 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium">
              <span>선택한 장소의 게시글만 보는 중</span>
              <button
                onClick={() => {
                  setContentIdFilter(null);
                  setBoardPage(0);
                }}
                className="underline"
              >
                초기화
              </button>
            </div>
          )}

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
                      <Badge
                        tone={post.notice_yn ? "warn" : "tag"}
                        shape="tag"
                        className="shrink-0"
                      >
                        {post.notice_yn ? "공지" : post.board_nm}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-ink mb-2 truncate font-semibold">{post.title}</h3>
                        <div className="text-steel flex flex-wrap items-center gap-2 text-sm">
                          <CommunityLevelBadge
                            level={post.writer_community_level}
                            size="sm"
                            showLabel={false}
                          />
                          <span>{post.writer_nm}</span>
                          <span>{formatCommunityDate(post.created_at)}</span>
                        </div>
                        <div className="text-steel mt-2 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            <span>{post.view_cnt}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            <span>{post.like_cnt}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>{post.comment_cnt}</span>
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
  const searchParams = useSearchParams();
  const boardParam = searchParams.get("board");
  const editParam = searchParams.get("edit");
  const contentIdParam = searchParams.get("contentId");
  const isEditing = !!editParam && /^\d+$/.test(editParam);
  const [boards, setBoards] = useState<CommunityBoard[]>([]);
  const [boardId, setBoardId] = useState<number | null>(
    boardParam && /^\d+$/.test(boardParam) ? Number(boardParam) : null
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlace, setSelectedPlace] = useState<SearchPlaceLite | null>(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [editForbidden, setEditForbidden] = useState(false);
  const {
    keyword: placeKeyword,
    setKeyword: setPlaceKeyword,
    results: placeResults,
    loading: placeSearching
  } = usePlaceQuickSearch();

  useEffect(() => {
    fetch("/api/community/boards")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setBoards((json as { boards?: CommunityBoard[] })?.boards ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!contentIdParam || isEditing) return;
    fetch(`/api/search?id=${encodeURIComponent(contentIdParam)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const found = Array.isArray(data) ? data[0] : null;
        if (found) setSelectedPlace({ id: found.id, name: found.name, image: found.image });
      })
      .catch(() => {});
  }, [contentIdParam, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    queueMicrotask(() => setLoadingEdit(true));
    fetch(`/api/community/board-posts/${editParam}`)
      .then(async (r) => ({
        ok: r.ok,
        json: (await r.json().catch(() => ({}))) as { post?: PostDetail; error?: string }
      }))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok || !json.post) {
          setSubmitError(json.error ?? "게시글을 불러오지 못했습니다.");
          return;
        }
        if (!json.post.can_edit) {
          setEditForbidden(true);
          return;
        }
        setBoardId(json.post.board_id);
        setTitle(json.post.title);
        setContent(json.post.content);
        setRating(json.post.rating);
        setImages(json.post.images ?? []);
        setFiles(json.post.files ?? []);
        if (json.post.attached_place) {
          setSelectedPlace({
            id: String(json.post.attached_place.content_id),
            name: json.post.attached_place.name,
            image: json.post.attached_place.image
          });
        }
      })
      .catch(() => {
        if (!cancelled) setSubmitError("게시글을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editParam, isEditing]);

  const selectedBoard = boards.find((b) => b.board_id === boardId);

  useEffect(() => {
    if (boards.length > 0 && !selectedBoard?.rating_yn) queueMicrotask(() => setRating(null));
  }, [boards, selectedBoard]);

  useEffect(() => {
    if (auth?.loading) return;
    requireLoginOrRedirect(auth?.user, router, "/community/new");
  }, [auth?.loading, auth?.user, router]);

  const handleSubmit = async () => {
    if (!boardId || !title.trim() || !content.trim()) return;
    if (!requireLoginOrRedirect(auth?.user, router, "/community/new")) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        content_id: selectedPlace ? Number(selectedPlace.id) : null,
        rating: selectedBoard?.rating_yn ? rating : null,
        images: selectedBoard?.allow_image ? images : [],
        files: selectedBoard?.allow_file ? files : []
      };
      const res = await fetch(
        isEditing ? `/api/community/board-posts/${editParam}` : "/api/community/board-posts",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isEditing ? payload : { board_id: boardId, ...payload })
        }
      );
      const json = (await res.json().catch(() => ({}))) as {
        post?: { id: number };
        error?: string;
      };
      if (!res.ok)
        throw new Error(
          json.error ?? (isEditing ? "수정에 실패했습니다." : "등록에 실패했습니다.")
        );
      router.push(
        isEditing
          ? `/community/${editParam}`
          : json.post?.id
            ? `/community/${json.post.id}`
            : "/community"
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const maxAttachments = selectedBoard?.max_upload_count ?? 0;
  const attachmentCount = images.length + files.length;

  const uploadAttachment = async (file: File): Promise<AttachedFile> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/community/upload", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      name?: string;
      size?: number;
      error?: string;
    };
    if (!res.ok || !json.url) throw new Error(json.error ?? "업로드에 실패했습니다.");
    return { url: json.url, name: json.name ?? file.name, size: json.size ?? file.size };
  };

  const handleImageFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setAttachError(null);
    const remaining = Math.max(0, maxAttachments - attachmentCount);
    const selected = Array.from(fileList).slice(0, remaining);
    if (selected.length < fileList.length)
      setAttachError(`첨부는 최대 ${maxAttachments}개까지 가능합니다.`);
    if (selected.length === 0) return;
    setUploadingImage(true);
    try {
      for (const file of selected) {
        const uploaded = await uploadAttachment(file);
        setImages((prev) => [...prev, uploaded.url]);
      }
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setAttachError(null);
    const remaining = Math.max(0, maxAttachments - attachmentCount);
    const selected = Array.from(fileList).slice(0, remaining);
    if (selected.length < fileList.length)
      setAttachError(`첨부는 최대 ${maxAttachments}개까지 가능합니다.`);
    if (selected.length === 0) return;
    setUploadingFile(true);
    try {
      for (const file of selected) {
        const uploaded = await uploadAttachment(file);
        setFiles((prev) => [...prev, uploaded]);
      }
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploadingFile(false);
    }
  };

  const canSubmit = !!boardId && !!title.trim() && !!content.trim();

  if (editForbidden) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/community")}>
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Button>
        <CommunityContentError
          message="본인 글만 수정할 수 있습니다."
          onRetry={() => router.push("/community")}
        />
      </div>
    );
  }

  if (loadingEdit) {
    return <p className="text-stone py-8 text-center text-sm">불러오는 중…</p>;
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
        <h1 className="text-ink flex-1 text-xl font-bold">
          {isEditing ? "게시글 수정" : "글쓰기"}
        </h1>
        <Button
          variant="accent"
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? "저장 중…" : isEditing ? "수정 완료" : "등록"}
        </Button>
      </div>

      {submitError && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {submitError}
        </div>
      )}

      {/* 게시판 선택 */}
      <div>
        <p className="text-slate mb-2 text-sm font-semibold">게시판</p>
        {selectedBoard ? (
          <span className="bg-brand-100 text-brand-700 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium">
            {selectedBoard.board_nm}
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {boards.length === 0 && <p className="text-stone text-sm">조회중 입니다.</p>}
            {boards.map((b) => (
              <button
                key={b.board_id}
                onClick={() => setBoardId(b.board_id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  boardId === b.board_id
                    ? "bg-brand-100 text-brand-700 ring-2 ring-current ring-offset-1"
                    : "bg-surface text-steel hover:bg-hairline"
                }`}
              >
                {b.board_nm}
              </button>
            ))}
          </div>
        )}
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

      {/* 별점 (게시판에서 별점 사용을 켠 경우만) */}
      {selectedBoard?.rating_yn && (
        <div>
          <p className="text-slate mb-2 text-sm font-semibold">별점</p>
          <div className="flex gap-1">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                onClick={() => setRating((prev) => (prev === n ? null : n))}
                aria-label={`별점 ${n}점`}
                className="p-0.5"
              >
                <Star
                  className={`h-6 w-6 ${
                    rating != null && n <= rating
                      ? "fill-yellow-400 text-yellow-500"
                      : "text-hairline"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {attachError && (
        <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
          {attachError}
        </div>
      )}

      {/* 이미지 첨부 */}
      {selectedBoard?.allow_image && (
        <div>
          <p className="text-slate mb-2 text-sm font-semibold">
            사진 첨부 <span className="text-stone font-normal">(선택)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={img} className="bg-surface relative h-20 w-20 overflow-hidden rounded-lg">
                <img src={img} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="bg-opacity-60 bg-charcoal absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full"
                >
                  <X className="h-2.5 w-2.5 text-white" />
                </button>
              </div>
            ))}
            {attachmentCount < maxAttachments && (
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="hover:border-brand-400 hover:text-brand-500 border-hairline text-stone flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed transition-colors disabled:opacity-50"
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-[10px]">
                  {uploadingImage ? "업로드 중…" : `${attachmentCount}/${maxAttachments}`}
                </span>
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                handleImageFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}

      {/* 파일 첨부 */}
      {selectedBoard?.allow_file && (
        <div>
          <p className="text-slate mb-2 text-sm font-semibold">
            파일 첨부 <span className="text-stone font-normal">(선택)</span>
          </p>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div
                key={f.url}
                className="border-hairline flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <Paperclip className="text-stone h-4 w-4 shrink-0" />
                <span className="text-ink min-w-0 flex-1 truncate">{f.name}</span>
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="파일 첨부 해제"
                >
                  <X className="text-stone hover:text-ink h-4 w-4" />
                </button>
              </div>
            ))}
            {attachmentCount < maxAttachments && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="hover:border-brand-400 hover:text-brand-500 border-hairline text-stone flex items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-2 text-sm transition-colors disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4" />
                {uploadingFile ? "업로드 중…" : "파일 추가"}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                handleFileFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}

      {/* 장소 첨부 */}
      <div>
        <p className="text-slate mb-2 text-sm font-semibold">
          장소 첨부 <span className="text-stone font-normal">(선택)</span>
        </p>
        {selectedPlace ? (
          <span className="bg-brand-50 border-brand-200 inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm">
            {selectedPlace.image ? (
              <img
                src={selectedPlace.image}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="bg-brand-100 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                <MapPin className="text-brand-600 h-3.5 w-3.5" />
              </span>
            )}
            <span className="text-brand-800 font-medium">{selectedPlace.name}</span>
            <button onClick={() => setSelectedPlace(null)} aria-label="장소 첨부 해제">
              <X className="text-brand-400 hover:text-brand-700 h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowPlacePicker((v) => !v)}
              className="border-hairline text-steel hover:bg-surface-soft flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors"
            >
              <MapPin className="h-4 w-4" />
              장소 추가
            </button>
            {showPlacePicker && (
              <div className="border-hairline absolute top-full left-0 z-20 mt-1 w-72 overflow-hidden rounded-lg border bg-white shadow-lg">
                <div className="border-hairline-soft border-b p-2">
                  <input
                    autoFocus
                    value={placeKeyword}
                    onChange={(e) => setPlaceKeyword(e.target.value)}
                    placeholder="장소 이름 검색"
                    className="border-hairline w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {placeSearching && (
                    <p className="text-stone px-3 py-3 text-center text-xs">검색 중…</p>
                  )}
                  {!placeSearching && placeKeyword.trim() && placeResults.length === 0 && (
                    <p className="text-stone px-3 py-3 text-center text-xs">검색 결과가 없어요</p>
                  )}
                  {!placeSearching &&
                    placeResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPlace(p);
                          setShowPlacePicker(false);
                        }}
                        className="border-hairline-soft hover:bg-surface-soft flex w-full items-center gap-2.5 border-b px-3 py-2.5 text-left transition-colors last:border-0"
                      >
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="bg-surface text-stone flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                            <MapPin className="h-4 w-4" />
                          </div>
                        )}
                        <p className="text-ink truncate text-sm font-medium">{p.name}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 등록 버튼 (모바일용) */}
      <Button
        variant="accent"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full py-3.5 md:hidden"
      >
        {isEditing ? "수정 완료" : "등록하기"}
      </Button>
    </div>
  );
}

// ── 게시글 상세 ──────────────────────────────────────────
type PostDetail = {
  id: number;
  board_id: number;
  board_nm: string;
  title: string;
  content: string;
  writer_nm: string;
  writer_community_level?: number;
  rating: number | null;
  view_cnt: number;
  like_cnt: number;
  comment_cnt: number;
  notice_yn: boolean;
  created_at: string;
  attached_place: { content_id: number; name: string; image: string } | null;
  images: string[];
  files: AttachedFile[];
  can_edit: boolean;
  comment_yn: boolean;
  liked: boolean;
};

type CommentItem = {
  id: number;
  content: string;
  created_at: string;
  author_nickname: string;
  author_community_level?: number;
  can_edit: boolean;
};

// 코스 첨부는 아직 실제 데이터가 없어 하드코딩된 예시 카드로만 보여준다.
const HARDCODED_COURSE = { id: 101, title: "대전 무장애 가족 나들이" };

function CommunityDetail({ id }: { id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentInput, setCommentInput] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const imageScrollRef = useRef<HTMLDivElement>(null);
  const imageDragRef = useRef({ dragging: false, moved: false, startX: 0, startScrollLeft: 0 });

  // 스크롤바를 숨긴 대신, 세로 휠 입력을 가로 스크롤로 변환해 마우스 휠로도 넘길 수 있게 한다.
  useEffect(() => {
    const el = imageScrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || e.deltaX !== 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [post?.images.length]);

  // 이미지는 기본적으로 브라우저가 드래그 대상으로 취급해 마우스로 끌면 스크롤 대신
  // 이미지 고스트/선택 블록이 뜬다. 직접 드래그를 가로채 스크롤로 처리한다.
  useEffect(() => {
    const el = imageScrollRef.current;
    if (!el) return;
    const drag = imageDragRef.current;
    const handleMouseDown = (e: MouseEvent) => {
      drag.dragging = true;
      drag.moved = false;
      drag.startX = e.pageX;
      drag.startScrollLeft = el.scrollLeft;
      e.preventDefault();
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!drag.dragging) return;
      const delta = e.pageX - drag.startX;
      if (Math.abs(delta) > 5) drag.moved = true;
      el.scrollLeft = drag.startScrollLeft - delta;
    };
    const handleMouseUp = () => {
      drag.dragging = false;
    };
    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [post?.images.length]);

  useEffect(() => {
    if (lightboxIndex === null || !post) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowLeft")
        setLightboxIndex((i) =>
          i === null ? i : (i - 1 + post.images.length) % post.images.length
        );
      else if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i === null ? i : (i + 1) % post.images.length));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, post]);

  const handleToggleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await fetch(`/api/community/board-posts/${id}/like`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        liked?: boolean;
        like_cnt?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "처리에 실패했습니다.");
      setPost((prev) =>
        prev ? { ...prev, liked: !!json.liked, like_cnt: json.like_cnt ?? prev.like_cnt } : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "좋아요 처리 실패");
    } finally {
      setLiking(false);
    }
  };

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/community/board-posts/${id}/comments`);
      const json = (await res.json().catch(() => ({}))) as { comments?: CommentItem[] };
      setComments(json.comments ?? []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void loadComments());
  }, [loadComments]);

  const handleCommentSubmit = async () => {
    if (!commentInput.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/community/board-posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentInput.trim() })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "댓글 등록에 실패했습니다.");
      setCommentInput("");
      await loadComments();
      setPost((prev) => (prev ? { ...prev, comment_cnt: prev.comment_cnt + 1 } : prev));
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "댓글 등록 실패");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    setCommentError(null);
    try {
      const res = await fetch(`/api/community/board-posts/${id}/comments/${commentId}`, {
        method: "DELETE"
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPost((prev) =>
        prev ? { ...prev, comment_cnt: Math.max(0, prev.comment_cnt - 1) } : prev
      );
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const startEditComment = (c: CommentItem) => {
    setEditingCommentId(c.id);
    setEditingContent(c.content);
  };

  const saveEditComment = async () => {
    if (!editingCommentId || !editingContent.trim()) return;
    setCommentError(null);
    try {
      const res = await fetch(`/api/community/board-posts/${id}/comments/${editingCommentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent.trim() })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "수정에 실패했습니다.");
      setComments((prev) =>
        prev.map((c) => (c.id === editingCommentId ? { ...c, content: editingContent.trim() } : c))
      );
      setEditingCommentId(null);
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "수정 실패");
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 게시글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/community/board-posts/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
      router.push("/community");
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
      setDeleting(false);
    }
  };

  const loadPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/board-posts/${id}`);
      const json = (await res.json().catch(() => ({}))) as {
        post?: PostDetail;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "게시글을 불러오지 못했습니다.");
      setPost(json.post ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void loadPost());
  }, [loadPost]);

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
        <Badge tone={post.notice_yn ? "warn" : "tag"} shape="tag">
          {post.notice_yn ? "공지" : post.board_nm}
        </Badge>
        {post.can_edit && (
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/community/new?edit=${post.id}`)}
            >
              <Pencil className="h-3.5 w-3.5" />
              수정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </Button>
          </div>
        )}
      </div>

      {/* Post */}
      <div>
        <h1 className="text-ink mb-3 text-xl font-bold">{post.title}</h1>
        <div className="border-hairline-soft text-steel flex flex-wrap items-center gap-2 border-b pb-4 text-sm">
          <CommunityLevelBadge level={post.writer_community_level} size="sm" />
          <span className="text-slate font-medium">{post.writer_nm}</span>
          <span>{formatCommunityDate(post.created_at)}</span>
        </div>
      </div>

      {/* 첨부 이미지 */}
      {post.images.length > 0 && (
        <div
          ref={imageScrollRef}
          className="flex cursor-grab [scrollbar-width:none] gap-2 overflow-x-auto pb-1 active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        >
          {post.images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => {
                if (imageDragRef.current.moved) return;
                setLightboxIndex(i);
              }}
              className="bg-surface h-40 w-64 shrink-0 overflow-hidden rounded-lg select-none"
            >
              <img
                src={img}
                alt=""
                draggable={false}
                className="h-full w-full object-cover select-none"
              />
            </button>
          ))}
        </div>
      )}

      <Card padding="lg">
        <p className="text-slate leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </Card>

      {/* 첨부 파일 */}
      {post.files.length > 0 && (
        <div className="space-y-2">
          {post.files.map((f) => (
            <a
              key={f.url}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-hairline hover:bg-surface-soft flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
            >
              <Paperclip className="text-stone h-4 w-4 shrink-0" />
              <span className="text-ink min-w-0 flex-1 truncate">{f.name}</span>
              <Download className="text-stone h-4 w-4 shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* 첨부된 장소 · 코스 */}
      <div className="space-y-2">
        <p className="text-stone px-1 text-xs font-semibold">첨부된 장소 · 코스</p>
        {post.attached_place && (
          <button
            onClick={() => router.push(`/map?contentId=${post.attached_place!.content_id}`)}
            className="border-brand-100 hover:bg-brand-50 hover:border-brand-300 flex w-full items-center gap-3 rounded-full border bg-white p-3.5 text-left transition-colors"
          >
            {post.attached_place.image ? (
              <img
                src={post.attached_place.image}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="bg-brand-100 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <MapPin className="text-brand-600 h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-ink truncate text-sm font-semibold">{post.attached_place.name}</p>
              <p className="text-brand-600 mt-0.5 text-xs">지도에서 보기</p>
            </div>
            <MapPin className="text-brand-400 h-4 w-4 shrink-0" />
          </button>
        )}
        <button
          onClick={() => router.push(`/course/${HARDCODED_COURSE.id}`)}
          className="border-navy-100 hover:border-navy-300 hover:bg-navy-50 flex w-full items-center gap-3 rounded-full border bg-white p-3.5 text-left transition-colors"
        >
          <div className="bg-navy-100 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Route className="text-navy-600 h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-ink text-sm font-semibold">{HARDCODED_COURSE.title}</p>
            <p className="text-navy-600 mt-0.5 text-xs">코스 상세보기</p>
          </div>
          <ChevronDown className="text-navy-400 h-4 w-4 shrink-0 -rotate-90" />
        </button>
      </div>

      {/* Stats */}
      <div className="text-steel flex items-center gap-4 text-sm">
        {post.rating != null && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
            <span>{post.rating}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          <span>{post.view_cnt}</span>
        </div>
        <button
          onClick={handleToggleLike}
          disabled={liking}
          className={`flex items-center gap-1 rounded-full px-1 transition-colors ${
            post.liked ? "text-red-500" : "hover:text-red-500"
          }`}
        >
          <Heart className={`h-4 w-4 ${post.liked ? "fill-red-500 text-red-500" : ""}`} />
          <span>{post.like_cnt}</span>
        </button>
        <div className="flex items-center gap-1">
          <MessageCircle className="h-4 w-4" />
          <span>{post.comment_cnt}</span>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="text-ink font-semibold">댓글 {post.comment_cnt}</h3>

        {commentError && (
          <div className="border-error/30 text-error rounded-lg border bg-red-50 px-4 py-3 text-sm">
            {commentError}
          </div>
        )}

        <div className="space-y-3">
          {commentsLoading && <p className="text-stone text-sm">불러오는 중…</p>}
          {!commentsLoading && comments.length === 0 && (
            <p className="text-stone text-sm">첫 댓글을 남겨보세요.</p>
          )}
          {!commentsLoading &&
            comments.map((c) => (
              <div key={c.id} className="bg-surface-soft rounded-lg p-4">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <CommunityLevelBadge
                      level={c.author_community_level}
                      size="sm"
                      showLabel={false}
                    />
                    <span className="text-ink font-semibold">{c.author_nickname}</span>
                    <span className="text-stone">{formatCommunityDate(c.created_at)}</span>
                  </div>
                  {c.can_edit && editingCommentId !== c.id && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => startEditComment(c)}
                        className="text-stone hover:text-ink text-xs font-semibold"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleCommentDelete(c.id)}
                        className="text-stone text-xs font-semibold hover:text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                {editingCommentId === c.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEditComment()}
                      className="border-hairline focus:ring-brand-500 flex-1 rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                    />
                    <Button size="sm" variant="accent" onClick={saveEditComment}>
                      저장
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>
                      취소
                    </Button>
                  </div>
                ) : (
                  <p className="text-slate text-sm">{c.content}</p>
                )}
              </div>
            ))}
        </div>

        {post.comment_yn ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
              placeholder="댓글을 입력하세요"
              className="focus:ring-brand-500 border-hairline flex-1 rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
            />
            <Button
              variant="accent"
              onClick={handleCommentSubmit}
              disabled={!commentInput.trim() || commentSubmitting}
              className="px-5 py-3"
            >
              등록
            </Button>
          </div>
        ) : (
          <p className="text-stone text-sm">댓글을 사용하지 않는 게시판입니다.</p>
        )}
      </div>

      {/* 이미지 라이트박스 */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            aria-label="닫기"
            className="absolute top-4 right-4 text-white/80 transition-colors hover:text-white"
          >
            <X className="h-7 w-7" />
          </button>
          {post.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) =>
                  i === null ? i : (i - 1 + post.images.length) % post.images.length
                );
              }}
              aria-label="이전 사진"
              className="absolute left-2 text-white/80 transition-colors hover:text-white sm:left-4"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          <img
            src={post.images[lightboxIndex]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
          {post.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? i : (i + 1) % post.images.length));
              }}
              aria-label="다음 사진"
              className="absolute right-2 text-white/80 transition-colors hover:text-white sm:right-4"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
          {post.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
              {lightboxIndex + 1} / {post.images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
