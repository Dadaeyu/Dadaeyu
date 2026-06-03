"use client";

import { useState } from "react";
import { MapPin, Star, Heart, Route, FileText, Pencil, Check } from "lucide-react";
import Link from "next/link";

// ── 데이터 ───────────────────────────────────────────────
const ACCESS_OPTIONS = [
  { key: "시각", icon: "👁️" },
  { key: "청각", icon: "🦻" },
  { key: "보행", icon: "♿" },
];

const THEME_OPTIONS = ["빵지순례", "먹거리", "액티비티", "과학", "자연힐링", "문화예술", "역사근대", "축제"];

const savedPlaces = [
  { id: 2, name: "성심당", category: "빵지순례", rating: 4.9, emoji: "🥐" },
  { id: 3, name: "한밭수목원", category: "자연힐링", rating: 4.7, emoji: "🌿" },
  { id: 1, name: "엑스포 과학공원", category: "과학", rating: 4.8, emoji: "🔬" },
];

const savedCourses = [
  { id: 10, title: "내 여행 계획", duration: "2일", places: 4 },
  { id: 101, title: "대전 무장애 가족 나들이", duration: "1일", places: 5 },
];

const myCourses = [
  { id: 1, title: "주말 대전 나들이", date: "2026.05.15", places: 5 },
  { id: 2, title: "가족 여행 코스", date: "2026.04.20", places: 8 },
];

const myPosts = [
  { id: 1, type: "후기", title: "성심당 무장애 이용 후기", date: "2026.05.30", likes: 24, comments: 8 },
  { id: 2, type: "팁", title: "대전 지하철 휠체어 이용 팁", date: "2026.05.21", likes: 18, comments: 5 },
];

const reports = [
  { id: 1, target: "성심당", content: "장애인 화장실 위치 정보 추가", date: "2026.05.28", status: "반영됨", points: 30 },
  { id: 2, target: "한밭수목원", content: "경사로 경사도 정보 수정", date: "2026.05.20", status: "검토중", points: 0 },
  { id: 3, target: "엑스포 과학공원", content: "휠체어 대여소 운영시간 제보", date: "2026.05.12", status: "반영됨", points: 30 },
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
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "saved", label: "즐겨찾기", count: savedPlaces.length + savedCourses.length },
    { key: "courses", label: "내 코스", count: myCourses.length },
    { key: "posts", label: "내 글", count: myPosts.length },
    { key: "reports", label: "제보 이력", count: reports.length },
  ];

  return (
    <div className="space-y-6">
      {/* ── 프로필 ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="h-20 bg-gradient-to-br from-navy-700 via-navy-600 to-brand-500" />
        <div className="px-5 md:px-6 pb-5 -mt-10">
          <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-md ring-4 ring-white flex items-center justify-center text-4xl shrink-0">
                👤
              </div>
              {!editingProfile && (
                <div className="pb-1">
                  <h2 className="text-xl font-bold text-gray-800">{nickname}</h2>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{gender}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{age}</span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setEditingProfile(v => !v)}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                editingProfile ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {editingProfile ? <><Check className="w-3.5 h-3.5" />완료</> : <><Pencil className="w-3.5 h-3.5" />프로필 편집</>}
            </button>
          </div>

          {editingProfile && (
            <div className="grid sm:grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">닉네임</p>
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">성별</p>
                <div className="flex gap-1.5">
                  {(["남성", "여성", "비공개"] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        gender === g ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">나이</p>
                <div className="flex flex-wrap gap-1.5">
                  {["10대", "20대", "30대", "40대", "50대+"].map(a => (
                    <button
                      key={a}
                      onClick={() => setAge(a)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        age === a ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* 접근성 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-800 mb-1">접근성</h3>
          <p className="text-xs text-gray-400 mb-3">필요한 편의를 선택하면 맞춤 추천에 반영돼요</p>
          <div className="flex flex-wrap gap-2">
            {ACCESS_OPTIONS.map(({ key, icon }) => {
              const on = access.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggle(access, setAccess, key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    on ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <span>{icon}</span>{key}
                </button>
              );
            })}
          </div>
        </div>

        {/* 선호 테마 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-800 mb-1">선호 테마</h3>
          <p className="text-xs text-gray-400 mb-3">관심 있는 테마를 모두 선택해 주세요</p>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map(theme => {
              const on = themes.includes(theme);
              return (
                <button
                  key={theme}
                  onClick={() => toggle(themes, setThemes, theme)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    on ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {theme}
                </button>
              );
            })}
          </div>
        </div>

        {/* 커뮤니티 점수 */}
        <div className="bg-gradient-to-br from-navy-600 to-brand-500 rounded-2xl p-5 text-white shadow-md shadow-navy-600/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white/90">커뮤니티 점수</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/20">Lv.4 탐험가</span>
          </div>
          <div className="text-3xl font-bold mb-3">850<span className="text-base font-medium text-white/70"> P</span></div>
          <div className="w-full bg-white/20 rounded-full h-2 mb-2">
            <div className="bg-gold-400 h-2 rounded-full" style={{ width: "70%" }} />
          </div>
          <p className="text-xs text-white/80">다음 등급까지 150P · 좋아요·작성 124개가 도움이 되고 있어요</p>
        </div>
      </div>

      {/* ── 목록 (즐겨찾기 / 내 코스 / 내 글 / 제보 이력) ── */}
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === key ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === key ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            {/* 서브탭 */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {([
                { key: "places", label: "장소", count: savedPlaces.length },
                { key: "courses", label: "코스", count: savedCourses.length },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setSavedSubTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    savedSubTab === key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    savedSubTab === key ? "bg-brand-100 text-brand-700" : "bg-gray-200 text-gray-500"
                  }`}>{count}</span>
                </button>
              ))}
            </div>

            {/* 장소 목록 */}
            {savedSubTab === "places" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedPlaces.map(place => (
                  <Link
                    key={place.id}
                    href={`/map?place=${place.id}`}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center shrink-0 text-xl">
                        {place.emoji}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate">{place.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{place.category}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-700">{place.rating}</span>
                      </div>
                      <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 코스 목록 */}
            {savedSubTab === "courses" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedCourses.map(course => (
                  <Link
                    key={course.id}
                    href={`/course/${course.id}`}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                        <Route className="w-5 h-5 text-purple-500" />
                      </div>
                      <h4 className="font-semibold text-gray-800 truncate">{course.title}</h4>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{course.duration} · {course.places}곳</p>
                      <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "courses" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myCourses.map(course => (
              <div key={course.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                    <Route className="w-4 h-4 text-brand-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 truncate">{course.title}</h4>
                </div>
                <p className="text-sm text-gray-500">{course.date} · {course.places}곳</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "posts" && (
          <div className="space-y-3">
            {myPosts.map(post => (
              <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    post.type === "후기" ? "bg-brand-100 text-brand-700" : "bg-navy-100 text-navy-700"
                  }`}>{post.type}</span>
                  <h4 className="font-semibold text-gray-800 truncate">{post.title}</h4>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{post.date}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{post.likes}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{post.comments}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 truncate">{report.target}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      report.status === "반영됨" ? "bg-brand-100 text-brand-700" : "bg-gold-100 text-gold-700"
                    }`}>{report.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{report.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{report.date}</p>
                </div>
                {report.points > 0 && (
                  <div className="text-right shrink-0">
                    <div className="text-brand-600 font-bold">+{report.points}P</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
