"use client";

import { useState } from "react";
import { Star, Heart, Route, FileText, Pencil, Check } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";

// ── 데이터 ───────────────────────────────────────────────
const ACCESS_OPTIONS = [
  { key: "시각", icon: "👁️" },
  { key: "청각", icon: "🦻" },
  { key: "보행", icon: "♿" }
];

const THEME_OPTIONS = [
  "빵지순례",
  "먹거리",
  "액티비티",
  "과학",
  "자연힐링",
  "문화예술",
  "역사근대",
  "축제"
];

const savedPlaces = [
  { id: 2, name: "성심당", category: "빵지순례", rating: 4.9, emoji: "🥐" },
  { id: 3, name: "한밭수목원", category: "자연힐링", rating: 4.7, emoji: "🌿" },
  { id: 1, name: "엑스포 과학공원", category: "과학", rating: 4.8, emoji: "🔬" }
];

const savedCourses = [
  { id: 10, title: "내 여행 계획", duration: "2일", places: 4 },
  { id: 101, title: "대전 무장애 가족 나들이", duration: "1일", places: 5 }
];

const myCourses = [
  { id: 1, title: "주말 대전 나들이", date: "2026.05.15", places: 5 },
  { id: 2, title: "가족 여행 코스", date: "2026.04.20", places: 8 }
];

const myPosts = [
  {
    id: 1,
    type: "후기",
    title: "성심당 무장애 이용 후기",
    date: "2026.05.30",
    likes: 24,
    comments: 8
  },
  {
    id: 2,
    type: "팁",
    title: "대전 지하철 휠체어 이용 팁",
    date: "2026.05.21",
    likes: 18,
    comments: 5
  }
];

const reports = [
  {
    id: 1,
    target: "성심당",
    content: "장애인 화장실 위치 정보 추가",
    date: "2026.05.28",
    status: "반영됨",
    points: 30
  },
  {
    id: 2,
    target: "한밭수목원",
    content: "경사로 경사도 정보 수정",
    date: "2026.05.20",
    status: "검토중",
    points: 0
  },
  {
    id: 3,
    target: "엑스포 과학공원",
    content: "휠체어 대여소 운영시간 제보",
    date: "2026.05.12",
    status: "반영됨",
    points: 30
  }
];

type TabKey = "saved" | "courses" | "posts" | "reports";

export default function MyPage() {
  // 프로필
  const [editingProfile, setEditingProfile] = useState(false);
  const [nickname, setNickname] = useState("미대전");
  const [gender, setGender] = useState<"남성" | "여성" | "비공개">("비공개");
  const [age, setAge] = useState("30대");

  // 접근성 / 테마 (중복 선택)
  const [access, setAccess] = useState<string[]>(["보행"]);
  const [themes, setThemes] = useState<string[]>(["빵지순례", "자연힐링"]);

  const [activeTab, setActiveTab] = useState<TabKey>("saved");
  const [savedSubTab, setSavedSubTab] = useState<"places" | "courses">("places");

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "saved", label: "즐겨찾기", count: savedPlaces.length + savedCourses.length },
    { key: "courses", label: "내 코스", count: myCourses.length },
    { key: "posts", label: "내 글", count: myPosts.length },
    { key: "reports", label: "제보 이력", count: reports.length }
  ];

  return (
    <div className="space-y-6">
      {/* ── 프로필 ── */}
      <div className="border-hairline overflow-hidden rounded-lg border bg-white">
        <div className="from-hero-sky-from to-hero-sky-to h-20 bg-gradient-to-b" />
        <div className="-mt-10 px-5 pb-5 md:px-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white text-4xl ring-4 ring-white">
                👤
              </div>
              {!editingProfile && (
                <div className="pb-1">
                  <h2 className="text-ink text-xl font-bold">{nickname}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="bg-surface text-steel rounded-full px-2 py-0.5 text-xs">
                      {gender}
                    </span>
                    <span className="bg-surface text-steel rounded-full px-2 py-0.5 text-xs">
                      {age}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setEditingProfile((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                editingProfile
                  ? "bg-brand-600 hover:bg-brand-600 text-ink"
                  : "border-hairline text-steel hover:bg-surface-soft border"
              }`}
            >
              {editingProfile ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  완료
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  프로필 편집
                </>
              )}
            </button>
          </div>

          {editingProfile && (
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-steel mb-1 text-xs font-semibold">닉네임</p>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="focus:ring-brand-500 border-hairline w-full rounded-lg border px-3 py-2 text-sm font-semibold focus:ring-2 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-steel mb-1 text-xs font-semibold">성별</p>
                <div className="flex gap-1.5">
                  {(["남성", "여성", "비공개"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
                        gender === g
                          ? "bg-brand-50 text-brand-700 ring-brand-300 ring-1"
                          : "bg-surface text-steel hover:bg-hairline"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-steel mb-1 text-xs font-semibold">나이</p>
                <div className="flex flex-wrap gap-1.5">
                  {["10대", "20대", "30대", "40대", "50대+"].map((a) => (
                    <button
                      key={a}
                      onClick={() => setAge(a)}
                      className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                        age === a
                          ? "bg-brand-50 text-brand-700 ring-brand-300 ring-1"
                          : "bg-surface text-steel hover:bg-hairline"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 접근성 / 선호 테마 / 커뮤니티 점수 ── */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        {/* 접근성 */}
        <Card padding="none" className="p-5">
          <h3 className="text-ink mb-1 font-bold">접근성</h3>
          <p className="text-stone mb-3 text-xs">필요한 편의를 선택하면 맞춤 추천에 반영돼요</p>
          <div className="flex flex-wrap gap-2">
            {ACCESS_OPTIONS.map(({ key, icon }) => {
              const on = access.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggle(access, setAccess, key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    on
                      ? "bg-brand-50 text-brand-700 ring-brand-300 ring-1"
                      : "bg-surface-soft text-steel hover:bg-surface"
                  }`}
                >
                  <span>{icon}</span>
                  {key}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 선호 테마 */}
        <Card padding="none" className="p-5">
          <h3 className="text-ink mb-1 font-bold">선호 테마</h3>
          <p className="text-stone mb-3 text-xs">관심 있는 테마를 모두 선택해 주세요</p>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map((theme) => {
              const on = themes.includes(theme);
              return (
                <button
                  key={theme}
                  onClick={() => toggle(themes, setThemes, theme)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${on ? "bg-brand-500 text-ink" : "bg-surface text-steel hover:bg-hairline"}`}
                >
                  {theme}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 커뮤니티 점수 — sky 밴드 위 ink 텍스트, mint 진행 바 */}
        <div className="from-hero-sky-from to-hero-sky-to text-ink rounded-lg bg-gradient-to-b p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-ink text-sm font-semibold">커뮤니티 점수</span>
            <span className="text-ink rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold ring-1 ring-white/70">
              Lv.4 탐험가
            </span>
          </div>
          <div className="mb-3 text-3xl font-bold">
            850<span className="text-slate text-base font-medium"> P</span>
          </div>
          <div className="bg-mint-soft/50 mb-2 h-2 w-full rounded-full">
            <div className="bg-mint-deep h-2 rounded-full" style={{ width: "70%" }} />
          </div>
          <p className="text-slate text-xs">
            다음 등급까지 150P · 좋아요·작성 124개가 도움이 되고 있어요
          </p>
        </div>
      </div>

      {/* ── 목록 (즐겨찾기 / 내 코스 / 내 글 / 제보 이력) ── */}
      <div className="space-y-4">
        {/* Tabs */}
        <Tabs
          items={tabs}
          value={activeTab}
          onValueChange={(k) => setActiveTab(k as TabKey)}
          variant="segmented"
        />

        {/* Tab content */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            {/* 서브탭 */}
            <div className="bg-surface flex w-fit gap-1 rounded-lg p-1">
              {(
                [
                  { key: "places", label: "장소", count: savedPlaces.length },
                  { key: "courses", label: "코스", count: savedCourses.length }
                ] as const
              ).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setSavedSubTab(key)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    savedSubTab === key ? "text-ink bg-white" : "text-steel hover:text-slate"
                  }`}
                >
                  {label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs ${savedSubTab === key ? "bg-brand-100 text-brand-700" : "bg-hairline text-steel"}`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* 장소 목록 */}
            {savedSubTab === "places" && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {savedPlaces.map((place) => (
                  <Card key={place.id} asChild variant="interactive">
                    <Link
                      href={`/map?place=${place.id}`}
                      className="flex items-center justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-brand-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl">
                          {place.emoji}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-ink truncate font-semibold">{place.name}</h4>
                          <p className="text-steel mt-0.5 text-xs">{place.category}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                          <span className="text-slate text-sm font-medium">{place.rating}</span>
                        </div>
                        <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            )}

            {/* 코스 목록 */}
            {savedSubTab === "courses" && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {savedCourses.map((course) => (
                  <Card key={course.id} asChild variant="interactive">
                    <Link href={`/course/${course.id}`}>
                      <div className="mb-2.5 flex items-center gap-3">
                        <div className="bg-navy-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                          <Route className="text-navy-500 h-5 w-5" />
                        </div>
                        <h4 className="text-ink truncate font-semibold">{course.title}</h4>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-steel text-xs">
                          {course.duration} · {course.places}곳
                        </p>
                        <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "courses" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myCourses.map((course) => (
              <Card key={course.id}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="bg-brand-100 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                    <Route className="text-brand-600 h-4 w-4" />
                  </div>
                  <h4 className="text-ink truncate font-semibold">{course.title}</h4>
                </div>
                <p className="text-steel text-sm">
                  {course.date} · {course.places}곳
                </p>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "posts" && (
          <div className="space-y-3">
            {myPosts.map((post) => (
              <Card key={post.id}>
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge tone={post.type === "후기" ? "brand" : "tag"}>{post.type}</Badge>
                  <h4 className="text-ink truncate font-semibold">{post.title}</h4>
                </div>
                <div className="text-steel flex items-center gap-4 text-sm">
                  <span>{post.date}</span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {post.comments}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-ink truncate font-semibold">{report.target}</span>
                    <Badge tone={report.status === "반영됨" ? "brand" : "warn"}>
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-steel truncate text-sm">{report.content}</p>
                  <p className="text-stone mt-1 text-xs">{report.date}</p>
                </div>
                {report.points > 0 && (
                  <div className="shrink-0 text-right">
                    <div className="text-brand-600 font-bold">+{report.points}P</div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
