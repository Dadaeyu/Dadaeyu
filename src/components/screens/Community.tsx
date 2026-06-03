"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Heart, MessageCircle, Eye, ArrowLeft, Image, X, Megaphone, Calendar, ChevronDown, HelpCircle, Pin, MapPin, Route } from "lucide-react";
import { PLACES, type Place } from "@/data/placesData";
import { useCourseContext, type MyCourse } from "@/context/CourseContext";

const posts = [
  { id: 1, type: "review", title: "성심당 무장애 이용 후기", author: "여행러버", date: "2026.05.30", likes: 24, comments: 8, views: 156 },
  { id: 2, type: "tip", title: "대전 지하철 휠체어 이용 팁", author: "대전토박이", date: "2026.05.29", likes: 18, comments: 5, views: 98 },
  { id: 3, type: "question", title: "한밭수목원 시각장애인 동반 가능한가요?", author: "궁금이", date: "2026.05.28", likes: 12, comments: 15, views: 234 },
];

const notices = [
  { id: "n1", title: "다대유 서비스 정식 오픈 안내", date: "2026.05.31", pinned: true },
  { id: "n2", title: "무장애 정보 제보 포인트 지급 정책 변경 안내", date: "2026.05.25", pinned: true },
  { id: "n3", title: "시스템 점검 안내 (5/28 02:00~04:00)", date: "2026.05.20", pinned: false },
  { id: "n4", title: "커뮤니티 이용 수칙 안내", date: "2026.05.10", pinned: false },
];

const events = [
  { id: "e1", title: "무장애 여행 사진 공모전", period: "2026.05.01 – 06.30", badge: "진행중", badgeColor: "bg-brand-100 text-brand-700", emoji: "📸", bg: "from-brand-400 to-brand-500", desc: "대전 무장애 여행 사진을 제출하고 상금을 받아가세요!" },
  { id: "e2", title: "접근성 관광지 탐방 투어", period: "2026.06.07 – 06.08", badge: "선착순", badgeColor: "bg-orange-100 text-orange-700", emoji: "🚌", bg: "from-orange-400 to-amber-500", desc: "가이드와 함께하는 무장애 관광지 탐방 1박 2일 투어" },
  { id: "e3", title: "여름 힐링 여행 할인 프로모션", period: "2026.06.01 – 08.31", badge: "D-93", badgeColor: "bg-navy-100 text-navy-700", emoji: "🏖️", bg: "from-navy-400 to-navy-600", desc: "무장애 시설 이용 시 최대 30% 할인 혜택을 드립니다." },
  { id: "e4", title: "보조기기 체험 행사", period: "2026.06.14", badge: "무료", badgeColor: "bg-gold-100 text-gold-700", emoji: "🦽", bg: "from-gold-300 to-gold-500", desc: "최신 이동 보조기기를 직접 체험해볼 수 있는 기회!" },
];

const faqs = [
  { id: "f1", q: "무장애 여행 정보는 어떻게 제보하나요?", a: "장소 상세 페이지 하단의 ‘정보 제보’ 버튼을 눌러 잘못된 정보나 추가 정보를 작성하시면 됩니다. 검토 후 반영되면 포인트가 지급돼요." },
  { id: "f2", q: "휠체어 대여가 가능한 장소는 어떻게 찾나요?", a: "지도 메뉴의 필터에서 접근성 항목을 선택하거나, 장소 상세의 접근성 정보에서 ‘휠체어 대여’ 표시를 확인하실 수 있습니다." },
  { id: "f3", q: "코스를 다른 사람과 공유할 수 있나요?", a: "코스 상세 화면의 공유 버튼을 통해 링크를 공유할 수 있으며, 공개로 설정한 코스는 ‘공유 코스’ 탭에 노출됩니다." },
  { id: "f4", q: "커뮤니티 점수는 어떻게 올리나요?", a: "후기·팁 작성, 정보 제보, 받은 좋아요 등 커뮤니티 활동을 하면 점수가 쌓이고 등급이 올라갑니다." },
  { id: "f5", q: "접근성 설정(고대비·음성 안내)은 어디서 바꾸나요?", a: "화면 우측 상단의 설정 아이콘을 누르면 스크린리더·화면확대·고대비·다크모드를 즉시 켜고 끌 수 있습니다." },
];

const typeLabels: Record<string, string> = { review: "후기", tip: "팁", question: "질문" };
const typeBadge = (type: string) =>
  type === "review" ? "bg-brand-100 text-brand-700"
  : type === "tip"  ? "bg-navy-100 text-navy-700"
  :                   "bg-orange-100 text-orange-700";

type MainTab = "board" | "notice" | "event" | "faq";

export default function Community() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const [mainTab, setMainTab] = useState<MainTab>("board");
  const [filter, setFilter] = useState<"all" | "review" | "tip" | "question">("all");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  if (id === "new") return <CommunityWrite />;
  if (id) return <CommunityDetail id={id} />;

  const filteredPosts = filter === "all" ? posts : posts.filter(p => p.type === filter);

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "board", label: "게시판" },
    { key: "notice", label: "공지사항" },
    { key: "event", label: "이벤트" },
    { key: "faq", label: "FAQ" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">커뮤니티</h1>
        {mainTab === "board" && (
          <Link
            href="/community/new"
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            글쓰기
          </Link>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {mainTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              mainTab === key ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 게시판 ── */}
      {mainTab === "board" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {([
              { key: "all", label: "전체" },
              { key: "review", label: "후기" },
              { key: "tip", label: "팁" },
              { key: "question", label: "질문" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                  filter === key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Posts List */}
          <div className="space-y-3">
            {filteredPosts.map(post => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-1 rounded font-medium shrink-0 ${typeBadge(post.type)}`}>
                    {typeLabels[post.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 mb-2 truncate">{post.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{post.author}</span>
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /><span>{post.likes}</span></div>
                      <div className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /><span>{post.comments}</span></div>
                      <div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /><span>{post.views}</span></div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── 공지사항 ── */}
      {mainTab === "notice" && (
        <div className="space-y-3">
          {notices.map(notice => (
            <div
              key={notice.id}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${notice.pinned ? "bg-brand-100" : "bg-gray-100"}`}>
                {notice.pinned ? <Pin className="w-4 h-4 text-brand-600 fill-brand-600" /> : <Megaphone className="w-4 h-4 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {notice.pinned && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-600 text-white shrink-0">중요</span>
                  )}
                  <h3 className="font-semibold text-gray-800 truncate">{notice.title}</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{notice.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 이벤트 ── */}
      {mainTab === "event" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map(ev => (
            <div
              key={ev.id}
              className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className={`h-32 bg-gradient-to-br ${ev.bg} flex items-center justify-center`}>
                <span className="text-5xl">{ev.emoji}</span>
              </div>
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ev.badgeColor}`}>{ev.badge}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{ev.period}</span>
                </div>
                <p className="font-bold text-gray-800 mb-1 leading-snug">{ev.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{ev.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FAQ ── */}
      {mainTab === "faq" && (
        <div className="space-y-2.5">
          {faqs.map(faq => {
            const open = openFaq === faq.id;
            return (
              <div key={faq.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(open ? null : faq.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">Q</span>
                  <span className="flex-1 font-semibold text-gray-800 text-sm">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="flex gap-3 px-4 pb-4 pt-1">
                    <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">A</span>
                    <p className="flex-1 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex items-center gap-2 justify-center pt-3 text-sm text-gray-400">
            <HelpCircle className="w-4 h-4" />
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
    setImages(prev => [...prev, `photo_${prev.length + 1}`]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/community")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 flex-1">글쓰기</h1>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim()}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          등록
        </button>
      </div>

      {/* 카테고리 선택 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">카테고리</p>
        <div className="flex gap-2">
          {(["review", "tip", "question"] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                type === t ? typeBadge(t) + " ring-2 ring-offset-1 ring-current" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {typeLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 제목 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">제목</p>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
          maxLength={50}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-right text-xs text-gray-400 mt-1">{title.length}/50</p>
      </div>

      {/* 내용 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">내용</p>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="여행 후기, 팁, 질문 등 자유롭게 작성해주세요"
          rows={10}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none leading-relaxed"
        />
        <p className="text-right text-xs text-gray-400 mt-1">{content.length}자</p>
      </div>

      {/* 이미지 첨부 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">사진 첨부 <span className="text-gray-400 font-normal">(선택)</span></p>
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative w-20 h-20 bg-gray-100 rounded-xl overflow-hidden">
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Image className="w-6 h-6" />
              </div>
              <button
                onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-4 h-4 bg-gray-800 bg-opacity-60 rounded-full flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              onClick={handleImageAdd}
              className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors"
            >
              <Image className="w-5 h-5" />
              <span className="text-[10px]">{images.length}/5</span>
            </button>
          )}
        </div>
      </div>

      {/* 장소 · 코스 첨부 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          장소 · 코스 첨부 <span className="text-gray-400 font-normal">(선택)</span>
        </p>

        {/* 첨부된 장소 chips */}
        {attachedPlaces.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedPlaces.map(place => (
              <span key={place.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-full text-sm">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span className="text-brand-800 font-medium">{place.name}</span>
                <button onClick={() => setAttachedPlaces(prev => prev.filter(p => p.id !== place.id))}>
                  <X className="w-3 h-3 text-brand-400 hover:text-brand-700" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 첨부된 코스 chips */}
        {attachedCourses.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedCourses.map(course => (
              <span key={course.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-sm">
                <Route className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-purple-800 font-medium">{course.title}</span>
                <button onClick={() => setAttachedCourses(prev => prev.filter(c => c.id !== course.id))}>
                  <X className="w-3 h-3 text-purple-400 hover:text-purple-700" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {/* 장소 추가 */}
          <div className="relative">
            <button
              onClick={() => { setShowPlacePicker(v => !v); setShowCoursePicker(false); }}
              disabled={attachedPlaces.length >= 3}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <MapPin className="w-4 h-4" />장소 추가
            </button>
            {showPlacePicker && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {PLACES.filter(p => !attachedPlaces.some(ap => ap.id === p.id)).length === 0 ? (
                  <p className="px-3 py-3 text-xs text-gray-400 text-center">모든 장소가 추가됐어요</p>
                ) : PLACES.filter(p => !attachedPlaces.some(ap => ap.id === p.id)).map(place => (
                  <button
                    key={place.id}
                    onClick={() => { setAttachedPlaces(prev => [...prev, place]); setShowPlacePicker(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="text-lg">{place.emoji}</span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800">{place.name}</p>
                      <p className="text-xs text-gray-400">{place.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 코스 추가 */}
          <div className="relative">
            <button
              onClick={() => { setShowCoursePicker(v => !v); setShowPlacePicker(false); }}
              disabled={attachedCourses.length >= 3}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Route className="w-4 h-4" />코스 추가
            </button>
            {showCoursePicker && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {myCourses.filter(c => !attachedCourses.some(ac => ac.id === c.id)).length === 0 ? (
                  <p className="px-3 py-3 text-xs text-gray-400 text-center">추가할 코스가 없어요</p>
                ) : myCourses.filter(c => !attachedCourses.some(ac => ac.id === c.id)).map(course => (
                  <button
                    key={course.id}
                    onClick={() => { setAttachedCourses(prev => [...prev, course]); setShowCoursePicker(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <Route className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{course.title}</p>
                      <p className="text-xs text-gray-400">{course.duration} · {course.days.reduce((s, d) => s + d.places.length, 0)}곳</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 등록 버튼 (모바일용) */}
      <button
        onClick={handleSubmit}
        disabled={!title.trim() || !content.trim()}
        className="w-full py-3.5 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors md:hidden"
      >
        등록하기
      </button>
    </div>
  );
}

// ── 게시글 상세 ──────────────────────────────────────────
const POST_ATTACHMENTS: Record<string, { places: Place[]; courses: { id: number; title: string }[] }> = {
  "1": {
    places: PLACES.filter(p => p.id === 2),
    courses: [{ id: 10, title: "내 여행 계획" }],
  },
};

function CommunityDetail({ id }: { id: string }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([
    { id: 1, author: "댓글러", content: "유용한 정보 감사합니다!", date: "2026.05.30" },
    { id: 2, author: "궁금이", content: "화장실도 무장애인가요?", date: "2026.05.30" },
  ]);

  const post = {
    type: "review",
    title: "성심당 무장애 이용 후기",
    author: "여행러버",
    date: "2026.05.30",
    content: "성심당에 다녀왔어요! 입구에 경사로가 잘 설치되어 있고, 내부 통로도 넓어서 휠체어 이용이 편했습니다. 직원분들도 친절하게 도와주셨어요. 추천합니다!",
    likes: 24,
  };

  const attachments = POST_ATTACHMENTS[id] ?? { places: [], courses: [] };

  const handleCommentSubmit = () => {
    if (!comment.trim()) return;
    setComments(prev => [...prev, { id: Date.now(), author: "나", content: comment.trim(), date: "2026.05.31" }]);
    setComment("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/community")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className={`text-xs px-2 py-1 rounded font-medium ${typeBadge(post.type)}`}>
          {typeLabels[post.type]}
        </span>
      </div>

      {/* Post */}
      <div>
        <h1 className="text-xl font-bold text-gray-800 mb-3">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500 pb-4 border-b border-gray-100">
          <span className="font-medium text-gray-700">{post.author}</span>
          <span>{post.date}</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* 첨부된 장소 · 코스 */}
      {(attachments.places.length > 0 || attachments.courses.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 px-1">첨부된 장소 · 코스</p>
          {attachments.places.map(place => (
            <button
              key={place.id}
              onClick={() => router.push(`/map?place=${place.id}`)}
              className="w-full flex items-center gap-3 p-3.5 bg-white border border-brand-100 rounded-xl hover:bg-brand-50 hover:border-brand-300 transition-colors text-left"
            >
              <span className="text-2xl shrink-0">{place.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{place.name}</p>
                <p className="text-xs text-brand-600 mt-0.5">지도에서 보기</p>
              </div>
              <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
            </button>
          ))}
          {attachments.courses.map(course => (
            <button
              key={course.id}
              onClick={() => router.push(`/course/${course.id}`)}
              className="w-full flex items-center gap-3 p-3.5 bg-white border border-purple-100 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Route className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{course.title}</p>
                <p className="text-xs text-purple-600 mt-0.5">코스 상세보기</p>
              </div>
              <ChevronDown className="w-4 h-4 text-purple-400 shrink-0 -rotate-90" />
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLiked(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            liked ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          <span className="text-sm">{post.likes + (liked ? 1 : 0)}</span>
        </button>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">댓글 {comments.length}</h3>
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-1.5 text-sm">
                <span className="font-semibold text-gray-800">{c.author}</span>
                <span className="text-gray-400">{c.date}</span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCommentSubmit()}
            placeholder="댓글을 입력하세요"
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleCommentSubmit}
            disabled={!comment.trim()}
            className="px-5 py-3 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-40 transition-colors"
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
