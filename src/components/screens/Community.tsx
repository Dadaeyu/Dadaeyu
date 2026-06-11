"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Heart,
  MessageCircle,
  Eye,
  ArrowLeft,
  Image,
  X,
  Megaphone,
  Calendar,
  ChevronDown,
  HelpCircle,
  Pin,
  MapPin,
  Route
} from "lucide-react";
import { PLACES, type Place } from "@/data/placesData";
import { useCourseContext, type MyCourse } from "@/context/CourseContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { genId } from "@/utils/id";

const posts = [
  {
    id: 1,
    type: "review",
    title: "성심당 무장애 이용 후기",
    author: "여행러버",
    date: "2026.05.30",
    likes: 24,
    comments: 8,
    views: 156
  },
  {
    id: 2,
    type: "tip",
    title: "대전 지하철 휠체어 이용 팁",
    author: "대전토박이",
    date: "2026.05.29",
    likes: 18,
    comments: 5,
    views: 98
  },
  {
    id: 3,
    type: "question",
    title: "한밭수목원 시각장애인 동반 가능한가요?",
    author: "궁금이",
    date: "2026.05.28",
    likes: 12,
    comments: 15,
    views: 234
  }
];

const notices = [
  { id: "n1", title: "다대유 서비스 정식 오픈 안내", date: "2026.05.31", pinned: true },
  {
    id: "n2",
    title: "무장애 정보 제보 포인트 지급 정책 변경 안내",
    date: "2026.05.25",
    pinned: true
  },
  { id: "n3", title: "시스템 점검 안내 (5/28 02:00~04:00)", date: "2026.05.20", pinned: false },
  { id: "n4", title: "커뮤니티 이용 수칙 안내", date: "2026.05.10", pinned: false }
];

const events = [
  {
    id: "e1",
    title: "무장애 여행 사진 공모전",
    period: "2026.05.01 – 06.30",
    badge: "진행중",
    badgeColor: "bg-brand-100 text-brand-700",
    emoji: "📸",
    bg: "from-brand-400 to-brand-500",
    desc: "대전 무장애 여행 사진을 제출하고 상금을 받아가세요!"
  },
  {
    id: "e2",
    title: "접근성 관광지 탐방 투어",
    period: "2026.06.07 – 06.08",
    badge: "선착순",
    badgeColor: "bg-orange-100 text-orange-700",
    emoji: "🚌",
    bg: "from-orange-400 to-gold-500",
    desc: "가이드와 함께하는 무장애 관광지 탐방 1박 2일 투어"
  },
  {
    id: "e3",
    title: "여름 힐링 여행 할인 프로모션",
    period: "2026.06.01 – 08.31",
    badge: "D-93",
    badgeColor: "bg-navy-100 text-navy-700",
    emoji: "🏖️",
    bg: "from-navy-400 to-navy-600",
    desc: "무장애 시설 이용 시 최대 30% 할인 혜택을 드립니다."
  },
  {
    id: "e4",
    title: "보조기기 체험 행사",
    period: "2026.06.14",
    badge: "무료",
    badgeColor: "bg-gold-100 text-gold-700",
    emoji: "🦽",
    bg: "from-gold-300 to-gold-500",
    desc: "최신 이동 보조기기를 직접 체험해볼 수 있는 기회!"
  }
];

const faqs = [
  {
    id: "f1",
    q: "무장애 여행 정보는 어떻게 제보하나요?",
    a: "장소 상세 페이지 하단의 ‘정보 제보’ 버튼을 눌러 잘못된 정보나 추가 정보를 작성하시면 됩니다. 검토 후 반영되면 포인트가 지급돼요."
  },
  {
    id: "f2",
    q: "휠체어 대여가 가능한 장소는 어떻게 찾나요?",
    a: "지도 메뉴의 필터에서 접근성 항목을 선택하거나, 장소 상세의 접근성 정보에서 ‘휠체어 대여’ 표시를 확인하실 수 있습니다."
  },
  {
    id: "f3",
    q: "코스를 다른 사람과 공유할 수 있나요?",
    a: "코스 상세 화면의 공유 버튼을 통해 링크를 공유할 수 있으며, 공개로 설정한 코스는 ‘공유 코스’ 탭에 노출됩니다."
  },
  {
    id: "f4",
    q: "커뮤니티 점수는 어떻게 올리나요?",
    a: "후기·팁 작성, 정보 제보, 받은 좋아요 등 커뮤니티 활동을 하면 점수가 쌓이고 등급이 올라갑니다."
  },
  {
    id: "f5",
    q: "접근성 설정(고대비·음성 안내)은 어디서 바꾸나요?",
    a: "화면 우측 상단의 설정 아이콘을 누르면 스크린리더·화면확대·고대비·다크모드를 즉시 켜고 끌 수 있습니다."
  }
];

const typeLabels: Record<string, string> = { review: "후기", tip: "팁", question: "질문" };
// 게시글 타입 → Badge tone (Badge 컴포넌트용)
const typeTone = (type: string): "brand" | "tag" | "orange" =>
  type === "review" ? "brand" : type === "tip" ? "tag" : "orange";
// 글쓰기 카테고리 선택 버튼의 활성 색 (배지 아닌 토글 버튼용)
const typeBadge = (type: string) =>
  type === "review"
    ? "bg-brand-100 text-brand-700"
    : type === "tip"
      ? "bg-navy-100 text-navy-700"
      : "bg-orange/10 text-orange-deep";

type MainTab = "board" | "notice" | "event" | "faq";

export default function Community() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const [mainTab, setMainTab] = useState<MainTab>("board");
  const [filter, setFilter] = useState<"all" | "review" | "tip" | "question">("all");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  if (id === "new") return <CommunityWrite />;
  if (id) return <CommunityDetail id={id} />;

  const filteredPosts = filter === "all" ? posts : posts.filter((p) => p.type === filter);

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
          <Button asChild variant="accent" size="sm">
            <Link href="/community/new">
              <Plus className="h-4 w-4" />
              글쓰기
            </Link>
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
          {/* Filters */}
          <Tabs
            variant="pill"
            value={filter}
            onValueChange={(k) => setFilter(k as typeof filter)}
            items={[
              { key: "all", label: "전체" },
              { key: "review", label: "후기" },
              { key: "tip", label: "팁" },
              { key: "question", label: "질문" }
            ]}
          />

          {/* Posts List */}
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <Card key={post.id} asChild variant="interactive">
                <Link href={`/community/${post.id}`} className="block">
                  <div className="flex items-start gap-3">
                    <Badge tone={typeTone(post.type)} shape="tag" className="shrink-0">
                      {typeLabels[post.type]}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-ink mb-2 truncate font-semibold">{post.title}</h3>
                      <div className="text-steel flex items-center gap-4 text-sm">
                        <span>{post.author}</span>
                        <span>{post.date}</span>
                      </div>
                      <div className="text-steel mt-2 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>{post.comments}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{post.views}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── 공지사항 ── */}
      {mainTab === "notice" && (
        <div className="space-y-3">
          {notices.map((notice) => (
            <Card
              key={notice.id}
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
                      중요
                    </span>
                  )}
                  <h3 className="text-ink truncate font-semibold">{notice.title}</h3>
                </div>
                <p className="text-stone mt-0.5 text-xs">{notice.date}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── 이벤트 ── */}
      {mainTab === "event" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((ev) => (
            <Card
              key={ev.id}
              variant="interactive"
              padding="none"
              className="cursor-pointer overflow-hidden"
            >
              <div className={`h-32 bg-gradient-to-br ${ev.bg} flex items-center justify-center`}>
                <span className="text-5xl">{ev.emoji}</span>
              </div>
              <div className="bg-white p-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <Badge tone="custom" className={`font-semibold ${ev.badgeColor}`}>
                    {ev.badge}
                  </Badge>
                  <span className="text-stone flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    {ev.period}
                  </span>
                </div>
                <p className="text-ink mb-1 leading-snug font-bold">{ev.title}</p>
                <p className="text-steel line-clamp-2 text-sm leading-relaxed">{ev.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── FAQ ── */}
      {mainTab === "faq" && (
        <div className="space-y-2.5">
          {faqs.map((faq) => {
            const open = openFaq === faq.id;
            return (
              <Card key={faq.id} padding="none" className="overflow-hidden">
                <button
                  onClick={() => setOpenFaq(open ? null : faq.id)}
                  className="hover:bg-surface-soft flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
                >
                  <span className="bg-brand-100 text-brand-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                    Q
                  </span>
                  <span className="text-ink flex-1 text-sm font-semibold">{faq.q}</span>
                  <ChevronDown
                    className={`text-stone h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div className="flex gap-3 px-4 pt-1 pb-4">
                    <span className="bg-surface text-steel flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                      A
                    </span>
                    <p className="text-steel flex-1 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </Card>
            );
          })}
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
  const [type, setType] = useState<"review" | "tip" | "question">("review");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const { myCourses } = useCourseContext();
  const [attachedPlaces, setAttachedPlaces] = useState<Place[]>([]);
  const [attachedCourses, setAttachedCourses] = useState<MyCourse[]>([]);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    // 실제 등록 로직 자리
    router.push("/community");
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
          disabled={!title.trim() || !content.trim()}
        >
          등록
        </Button>
      </div>

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
          className="focus:ring-brand-500 border-hairline w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
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
          className="focus:ring-brand-500 border-hairline w-full resize-none rounded-lg border px-4 py-3 text-sm leading-relaxed focus:ring-2 focus:outline-none"
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
                <Image className="h-6 w-6" />
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
              <Image className="h-5 w-5" />
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
const POST_ATTACHMENTS: Record<
  string,
  { places: Place[]; courses: { id: number; title: string }[] }
> = {
  "1": {
    places: PLACES.filter((p) => p.id === 2),
    courses: [{ id: 10, title: "내 여행 계획" }]
  }
};

function CommunityDetail({ id }: { id: string }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([
    { id: 1, author: "댓글러", content: "유용한 정보 감사합니다!", date: "2026.05.30" },
    { id: 2, author: "궁금이", content: "화장실도 무장애인가요?", date: "2026.05.30" }
  ]);

  const post = {
    type: "review",
    title: "성심당 무장애 이용 후기",
    author: "여행러버",
    date: "2026.05.30",
    content:
      "성심당에 다녀왔어요! 입구에 경사로가 잘 설치되어 있고, 내부 통로도 넓어서 휠체어 이용이 편했습니다. 직원분들도 친절하게 도와주셨어요. 추천합니다!",
    likes: 24
  };

  const attachments = POST_ATTACHMENTS[id] ?? { places: [], courses: [] };

  const handleCommentSubmit = () => {
    if (!comment.trim()) return;
    setComments((prev) => [
      ...prev,
      { id: genId(), author: "나", content: comment.trim(), date: "2026.05.31" }
    ]);
    setComment("");
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
        <Badge tone={typeTone(post.type)} shape="tag">
          {typeLabels[post.type]}
        </Badge>
      </div>

      {/* Post */}
      <div>
        <h1 className="text-ink mb-3 text-xl font-bold">{post.title}</h1>
        <div className="border-hairline-soft text-steel flex items-center gap-3 border-b pb-4 text-sm">
          <span className="text-slate font-medium">{post.author}</span>
          <span>{post.date}</span>
        </div>
      </div>

      <Card padding="lg">
        <p className="text-slate leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </Card>

      {/* 첨부된 장소 · 코스 */}
      {(attachments.places.length > 0 || attachments.courses.length > 0) && (
        <div className="space-y-2">
          <p className="text-stone px-1 text-xs font-semibold">첨부된 장소 · 코스</p>
          {attachments.places.map((place) => (
            <button
              key={place.id}
              onClick={() => router.push(`/map?place=${place.id}`)}
              className="border-brand-100 hover:bg-brand-50 hover:border-brand-300 flex w-full items-center gap-3 rounded-full border bg-white p-3.5 text-left transition-colors"
            >
              <span className="shrink-0 text-2xl">{place.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm font-semibold">{place.name}</p>
                <p className="text-brand-600 mt-0.5 text-xs">지도에서 보기</p>
              </div>
              <MapPin className="text-brand-400 h-4 w-4 shrink-0" />
            </button>
          ))}
          {attachments.courses.map((course) => (
            <button
              key={course.id}
              onClick={() => router.push(`/course/${course.id}`)}
              className="border-navy-100 hover:border-navy-300 hover:bg-navy-50 flex w-full items-center gap-3 rounded-full border bg-white p-3.5 text-left transition-colors"
            >
              <div className="bg-navy-100 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <Route className="text-navy-600 h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm font-semibold">{course.title}</p>
                <p className="text-navy-600 mt-0.5 text-xs">코스 상세보기</p>
              </div>
              <ChevronDown className="text-navy-400 h-4 w-4 shrink-0 -rotate-90" />
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLiked((v) => !v)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 transition-colors ${
            liked
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-hairline text-steel hover:bg-surface-soft bg-white"
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          <span className="text-sm">{post.likes + (liked ? 1 : 0)}</span>
        </button>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="text-ink font-semibold">댓글 {comments.length}</h3>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-surface-soft rounded-lg p-4">
              <div className="mb-1.5 flex items-center gap-3 text-sm">
                <span className="text-ink font-semibold">{c.author}</span>
                <span className="text-stone">{c.date}</span>
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
            onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
            placeholder="댓글을 입력하세요"
            className="focus:ring-brand-500 border-hairline flex-1 rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
          />
          <Button
            variant="accent"
            onClick={handleCommentSubmit}
            disabled={!comment.trim()}
            className="px-5 py-3"
          >
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}
