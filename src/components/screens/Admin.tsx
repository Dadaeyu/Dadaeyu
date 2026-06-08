"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Route,
  Flag,
  Calendar,
  Database,
  ExternalLink,
  Search,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Eye,
  EyeOff,
  TrendingUp,
  ShieldCheck,
  Star,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  FileText,
  ChevronRight
} from "lucide-react";
import { PLACES } from "@/data/placesData";

// ── 사이드바 메뉴 ─────────────────────────────────────────
const SECTIONS = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "users", label: "유저 관리", icon: Users },
  { key: "places", label: "장소 관리", icon: MapPin },
  { key: "courses", label: "코스 관리", icon: Route },
  { key: "reports", label: "제보 확인", icon: Flag },
  { key: "events", label: "이벤트 관리", icon: Calendar },
  { key: "supabase", label: "Supabase", icon: Database }
];

// ── 목업 데이터 ───────────────────────────────────────────
type UserStatus = "정상" | "정지";
type UserRole = "일반" | "관리자";
interface AdminUser {
  id: number;
  nickname: string;
  email: string;
  joined: string;
  level: string;
  role: UserRole;
  status: UserStatus;
}

const INIT_USERS: AdminUser[] = [
  {
    id: 1,
    nickname: "여행러버",
    email: "travel@email.com",
    joined: "2026.01.15",
    level: "Lv.5",
    role: "일반",
    status: "정상"
  },
  {
    id: 2,
    nickname: "대전토박이",
    email: "daejeon@email.com",
    joined: "2026.02.20",
    level: "Lv.3",
    role: "일반",
    status: "정상"
  },
  {
    id: 3,
    nickname: "빵순이여행기",
    email: "bread@email.com",
    joined: "2026.03.05",
    level: "Lv.4",
    role: "일반",
    status: "정상"
  },
  {
    id: 4,
    nickname: "힐링여행자",
    email: "healing@email.com",
    joined: "2026.03.18",
    level: "Lv.2",
    role: "일반",
    status: "정지"
  },
  {
    id: 5,
    nickname: "관리자",
    email: "admin@dadaeyu.kr",
    joined: "2025.12.01",
    level: "관리자",
    role: "관리자",
    status: "정상"
  }
];

type ReportStatus = "대기" | "검토중" | "반영됨" | "반려";
interface AdminReport {
  id: number;
  target: string;
  user: string;
  content: string;
  date: string;
  status: ReportStatus;
}

const INIT_REPORTS: AdminReport[] = [
  {
    id: 1,
    target: "성심당",
    user: "여행러버",
    content: "장애인 화장실 위치 정보 추가",
    date: "2026.05.28",
    status: "반영됨"
  },
  {
    id: 2,
    target: "한밭수목원",
    user: "대전토박이",
    content: "경사로 경사도 정보 수정 요청",
    date: "2026.05.20",
    status: "검토중"
  },
  {
    id: 3,
    target: "엑스포 과학공원",
    user: "빵순이여행기",
    content: "휠체어 대여소 운영시간 제보",
    date: "2026.05.12",
    status: "반영됨"
  },
  {
    id: 4,
    target: "대청호 오백리길",
    user: "힐링여행자",
    content: "데크로드 구간 정보 오류",
    date: "2026.06.01",
    status: "대기"
  },
  {
    id: 5,
    target: "유성온천",
    user: "travel_dj",
    content: "수중 리프트 운영 중단 제보",
    date: "2026.06.02",
    status: "대기"
  }
];

interface AdminCourse {
  id: number;
  title: string;
  author: string;
  duration: string;
  places: number;
  best: boolean;
  visible: boolean;
  date: string;
}

const INIT_COURSES: AdminCourse[] = [
  {
    id: 101,
    title: "대전 무장애 가족 나들이",
    author: "대전관광공사",
    duration: "1일",
    places: 5,
    best: true,
    visible: true,
    date: "2025.04.10"
  },
  {
    id: 102,
    title: "휠체어로 즐기는 성심당 & 수목원",
    author: "대전관광공사",
    duration: "반일",
    places: 3,
    best: true,
    visible: true,
    date: "2025.03.28"
  },
  {
    id: 103,
    title: "유성온천 힐링 코스",
    author: "대전시청 관광과",
    duration: "1일",
    places: 4,
    best: false,
    visible: true,
    date: "2025.02.15"
  },
  {
    id: 104,
    title: "엄마랑 아이랑 과학 탐험",
    author: "travel_daejeon",
    duration: "반일",
    places: 2,
    best: false,
    visible: true,
    date: "2025.05.02"
  },
  {
    id: 10,
    title: "내 여행 계획",
    author: "미대전",
    duration: "2일",
    places: 4,
    best: false,
    visible: false,
    date: "2026.05.15"
  }
];

interface AdminEvent {
  id: string;
  title: string;
  period: string;
  badge: string;
  emoji: string;
  visible: boolean;
}

const INIT_EVENTS: AdminEvent[] = [
  {
    id: "e1",
    title: "무장애 여행 사진 공모전",
    period: "2026.05.01 – 06.30",
    badge: "진행중",
    emoji: "📸",
    visible: true
  },
  {
    id: "e2",
    title: "접근성 관광지 탐방 투어",
    period: "2026.06.07 – 06.08",
    badge: "선착순",
    emoji: "🚌",
    visible: true
  },
  {
    id: "e3",
    title: "여름 힐링 여행 할인 프로모션",
    period: "2026.06.01 – 08.31",
    badge: "D-93",
    emoji: "🏖️",
    visible: true
  },
  {
    id: "e4",
    title: "보조기기 체험 행사",
    period: "2026.06.14",
    badge: "무료",
    emoji: "🦽",
    visible: false
  }
];

// ── 공통 스타일 헬퍼 ─────────────────────────────────────
const reportBadge = (s: ReportStatus) =>
  s === "대기"
    ? "bg-red-100 text-red-700"
    : s === "검토중"
      ? "bg-yellow-100 text-yellow-700"
      : s === "반영됨"
        ? "bg-brand-100 text-brand-700"
        : "bg-gray-100 text-gray-500";

// ── 레이아웃 ─────────────────────────────────────────────
export default function Admin() {
  const params = useParams();
  const section = typeof params.section === "string" ? params.section : "dashboard";
  const router = useRouter();

  return (
    <div
      className="-mx-4 -mt-6 -mb-24 flex md:-mx-6 md:-mb-6"
      style={{ minHeight: "calc(100vh - 64px)" }}
    >
      {/* 데스크톱 사이드바 */}
      <aside className="hidden w-56 shrink-0 flex-col gap-0.5 border-r border-gray-100 bg-white px-3 py-6 md:flex">
        <p className="mb-2 px-3 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
          관리자
        </p>
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const active = section === key;
          return (
            <button
              key={key}
              onClick={() => router.push(key === "dashboard" ? "/admin" : `/admin/${key}`)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? "text-indigo-600" : "text-gray-400"}`}
              />
              {label}
              {key === "reports" && (
                <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  2
                </span>
              )}
            </button>
          );
        })}
      </aside>

      {/* 메인 영역 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 탭바 */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 bg-white px-4 py-2 md:hidden">
          {SECTIONS.map(({ key, label, icon: Icon }) => {
            const active = section === key;
            return (
              <button
                key={key}
                onClick={() => router.push(key === "dashboard" ? "/admin" : `/admin/${key}`)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto px-4 py-6 md:px-8">
          {section === "dashboard" && <Dashboard />}
          {section === "users" && <UserManagement />}
          {section === "places" && <PlaceManagement />}
          {section === "courses" && <CourseManagement />}
          {section === "reports" && <ReportManagement />}
          {section === "events" && <EventManagement />}
          {section === "supabase" && <SupabaseTest />}
        </div>
      </div>
    </div>
  );
}

// ── 1. 대시보드 ──────────────────────────────────────────
function Dashboard() {
  const stats = [
    {
      label: "총 회원",
      value: "1,234",
      delta: "+12",
      icon: Users,
      bg: "bg-blue-50",
      color: "text-blue-600"
    },
    {
      label: "등록 장소",
      value: "5",
      delta: "+0",
      icon: MapPin,
      bg: "bg-brand-50",
      color: "text-brand-600"
    },
    {
      label: "공개 코스",
      value: "4",
      delta: "+1",
      icon: Route,
      bg: "bg-purple-50",
      color: "text-purple-600"
    },
    {
      label: "제보 대기",
      value: "2",
      delta: "처리필요",
      icon: AlertCircle,
      bg: "bg-red-50",
      color: "text-red-600"
    }
  ];

  const recentReports = INIT_REPORTS.filter((r) => r.status === "대기" || r.status === "검토중");

  const weeklyData = [40, 65, 52, 78, 60, 91, 84];
  const max = Math.max(...weeklyData);
  const days = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">관리자 대시보드</h1>
        <p className="mt-0.5 text-sm text-gray-400">2026년 6월 3일 기준</p>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, delta, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={`h-10 w-10 ${bg} mb-3 flex items-center justify-center rounded-xl`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-sm text-gray-500">{label}</p>
              <span className="text-brand-600 text-xs font-semibold">{delta}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 주간 신규 가입 */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">주간 신규 가입</h3>
            <TrendingUp className="text-brand-500 h-4 w-4" />
          </div>
          <div className="flex h-28 items-end gap-2">
            {weeklyData.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="bg-brand-400 w-full rounded-t-md transition-all"
                  style={{ height: `${(v / max) * 100}%` }}
                />
                <span className="text-[10px] text-gray-400">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 처리 필요 제보 */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">처리 필요 제보</h3>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
              {recentReports.length}건
            </span>
          </div>
          <div className="space-y-3">
            {recentReports.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">처리할 제보가 없어요 🎉</p>
            )}
            {recentReports.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-gray-50 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{r.target}</p>
                  <p className="truncate text-xs text-gray-500">{r.content}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {r.user} · {r.date}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${reportBadge(r.status)}`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 접근 권한 안내 */}
      <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <ShieldCheck className="mt-0.5 h-8 w-8 shrink-0 text-indigo-500" />
        <div>
          <p className="mb-1 font-bold text-indigo-800">관리자 접근 권한</p>
          <p className="text-sm text-indigo-600">
            현재 계정은 슈퍼 관리자 권한을 보유하고 있습니다. 좌측 메뉴에서
            유저·장소·코스·제보·이벤트를 관리하세요. 모든 변경사항은 즉시 서비스에 반영됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 2. 유저 관리 ─────────────────────────────────────────
function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>(INIT_USERS);
  const [query, setQuery] = useState("");

  const filtered = users.filter((u) => u.nickname.includes(query) || u.email.includes(query));

  const toggleStatus = (id: number) =>
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: u.status === "정상" ? "정지" : "정상" } : u))
    );

  const toggleRole = (id: number) =>
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: u.role === "일반" ? "관리자" : "일반" } : u))
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">유저 관리</h1>
        <span className="text-sm text-gray-400">총 {users.length}명</span>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임 또는 이메일 검색"
          className="w-full rounded-xl border border-gray-200 py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["닉네임", "이메일", "가입일", "등급", "권한", "상태", "액션"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-bold whitespace-nowrap text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-semibold text-gray-800">{u.nickname}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-400">{u.joined}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      {u.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRole(u.id)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                        u.role === "관리자"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                      }`}
                    >
                      {u.role}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(u.id)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                        u.status === "정상"
                          ? "bg-brand-100 text-brand-700 hover:bg-red-50 hover:text-red-600"
                          : "hover:bg-brand-50 hover:text-brand-600 bg-red-100 text-red-700"
                      }`}
                    >
                      {u.status}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">검색 결과가 없어요</p>
        )}
      </div>
    </div>
  );
}

// ── 3. 장소 관리 ─────────────────────────────────────────
function PlaceManagement() {
  const [places, setPlaces] = useState(PLACES);
  const [query, setQuery] = useState("");

  const filtered = places.filter((p) => p.name.includes(query) || p.category.includes(query));

  const deletePlace = (id: number) => setPlaces((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">장소 관리</h1>
        <button className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          장소 등록
        </button>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="장소명 또는 카테고리 검색"
          className="w-full rounded-xl border border-gray-200 py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["장소명", "카테고리", "평점", "접근성 태그", "액션"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-bold whitespace-nowrap text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="font-semibold text-gray-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: p.bg, color: p.color }}
                    >
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-gray-700">{p.rating}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.accessibility.map((a) => (
                        <span
                          key={a}
                          className="bg-brand-50 text-brand-700 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deletePlace(p.id)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">검색 결과가 없어요</p>
        )}
      </div>
    </div>
  );
}

// ── 4. 코스 관리 ─────────────────────────────────────────
function CourseManagement() {
  const [courses, setCourses] = useState<AdminCourse[]>(INIT_COURSES);
  const [filter, setFilter] = useState<"전체" | "베스트" | "비공개">("전체");

  const filtered = courses.filter((c) =>
    filter === "전체" ? true : filter === "베스트" ? c.best : !c.visible
  );

  const toggleBest = (id: number) =>
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, best: !c.best } : c)));
  const toggleVisible = (id: number) =>
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  const deleteCourse = (id: number) => setCourses((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">코스 관리</h1>
        <button className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          코스 등록
        </button>
      </div>

      <div className="flex gap-2">
        {(["전체", "베스트", "비공개"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="truncate font-semibold text-gray-800">{c.title}</h3>
                {c.best && (
                  <span className="shrink-0 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-700">
                    BEST
                  </span>
                )}
                {!c.visible && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                    비공개
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {c.author} · {c.duration} · {c.places}곳 · {c.date}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* 베스트 토글 */}
              <button
                onClick={() => toggleBest(c.id)}
                title="베스트 코스 설정"
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  c.best
                    ? "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    : "border-gray-200 bg-white text-gray-500 hover:border-yellow-300 hover:text-yellow-600"
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${c.best ? "fill-yellow-400 text-yellow-400" : ""}`}
                />
                베스트
              </button>

              {/* 노출 토글 */}
              <button
                onClick={() => toggleVisible(c.id)}
                title="공개 여부 변경"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                {c.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>

              <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteCourse(c.id)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">해당하는 코스가 없어요</p>
        )}
      </div>
    </div>
  );
}

// ── 5. 제보 확인 ─────────────────────────────────────────
function ReportManagement() {
  const [reports, setReports] = useState<AdminReport[]>(INIT_REPORTS);
  const [filter, setFilter] = useState<ReportStatus | "전체">("전체");

  const filtered = filter === "전체" ? reports : reports.filter((r) => r.status === filter);

  const setStatus = (id: number, status: ReportStatus) =>
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const counts: Record<string, number> = {
    전체: reports.length,
    대기: reports.filter((r) => r.status === "대기").length,
    검토중: reports.filter((r) => r.status === "검토중").length,
    반영됨: reports.filter((r) => r.status === "반영됨").length,
    반려: reports.filter((r) => r.status === "반려").length
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">제보 내용 확인</h1>
        <span className="text-sm text-gray-400">총 {reports.length}건</span>
      </div>

      {/* 상태 필터 */}
      <div className="flex flex-wrap gap-2">
        {(["전체", "대기", "검토중", "반영됨", "반려"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filter === f ? "bg-white/20 text-white" : "bg-white text-gray-500"}`}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="font-bold text-gray-800">{r.target}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${reportBadge(r.status)}`}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="mb-1 text-sm text-gray-600">{r.content}</p>
                <p className="text-xs text-gray-400">
                  {r.user} · {r.date}
                </p>
              </div>

              {/* 상태 변경 액션 */}
              {(r.status === "대기" || r.status === "검토중") && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {r.status === "대기" && (
                    <button
                      onClick={() => setStatus(r.id, "검토중")}
                      className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 transition-colors hover:bg-yellow-100"
                    >
                      검토 시작
                    </button>
                  )}
                  <button
                    onClick={() => setStatus(r.id, "반영됨")}
                    className="bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    반영
                  </button>
                  <button
                    onClick={() => setStatus(r.id, "반려")}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                    반려
                  </button>
                </div>
              )}
              {(r.status === "반영됨" || r.status === "반려") && (
                <button
                  onClick={() => setStatus(r.id, "대기")}
                  className="shrink-0 text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
                >
                  되돌리기
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">해당하는 제보가 없어요</p>
        )}
      </div>
    </div>
  );
}

// ── 6. 이벤트 관리 ───────────────────────────────────────
function EventManagement() {
  const [events, setEvents] = useState<AdminEvent[]>(INIT_EVENTS);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPeriod, setNewPeriod] = useState("");
  const [newBadge, setNewBadge] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎉");

  const toggleVisible = (id: string) =>
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)));

  const deleteEvent = (id: string) => setEvents((prev) => prev.filter((e) => e.id !== id));

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    setEvents((prev) => [
      ...prev,
      {
        id: `e${Date.now()}`,
        title: newTitle,
        period: newPeriod,
        badge: newBadge,
        emoji: newEmoji,
        visible: true
      }
    ]);
    setNewTitle("");
    setNewPeriod("");
    setNewBadge("");
    setNewEmoji("🎉");
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">이벤트 관리</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          이벤트 등록
        </button>
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <p className="text-sm font-bold text-indigo-800">새 이벤트 등록</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">이모지</label>
              <input
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                placeholder="🎉"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">배지</label>
              <input
                value={newBadge}
                onChange={(e) => setNewBadge(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                placeholder="진행중"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-500">이벤트명</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                placeholder="이벤트 제목"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-500">기간</label>
              <input
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                placeholder="2026.07.01 – 07.31"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            >
              등록
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className={`flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm transition-opacity ${ev.visible ? "border-gray-100" : "border-dashed border-gray-200 opacity-60"}`}
          >
            <span className="shrink-0 text-2xl">{ev.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <h3 className="truncate font-semibold text-gray-800">{ev.title}</h3>
                <span className="bg-brand-100 text-brand-700 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {ev.badge}
                </span>
                {!ev.visible && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                    숨김
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{ev.period}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => toggleVisible(ev.id)}
                title={ev.visible ? "노출 중지" : "노출 시작"}
                className={`rounded-lg p-1.5 transition-colors ${ev.visible ? "text-gray-400 hover:bg-gray-100 hover:text-gray-600" : "hover:bg-brand-50 hover:text-brand-500 text-gray-300"}`}
              >
                {ev.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteEvent(ev.id)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 7. Supabase 테스트 ───────────────────────────────────
function SupabaseTest() {
  // 클라이언트 컴포넌트 라이브 테스트 //
  const [clientStatus, setClientStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [clientResult, setClientResult] = useState<unknown>(null);
  const [clientError, setClientError] = useState("");

  const isEnvSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  const runClientFetch = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setClientStatus("error");
      setClientError(
        ".env.local에 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.\n아래 환경 변수 설정 안내를 참고하세요."
      );
      return;
    }

    setClientStatus("loading");
    setClientResult(null);
    setClientError("");
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase.from("tb_test").select("*").limit(5);
      console.log(data);

      if (error) throw error;

      setClientResult(data);
      setClientStatus("success");
      console.log(clientResult);
    } catch (e: unknown) {
      setClientError(e instanceof Error ? e.message : String(e));
      setClientStatus("error");
    }
  };

  const clientSnippet = `'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MyComponent() {
  const [data, setData] = useState([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('tb_test')  // 테이블 이름
      .select('id, created_at')  // 컬럼 이름
      .then(({ data }) => {
        if (data) setData(data)
      })
  }, [])

  return <ul>{data.map(d => <li key={d.id}>{d.name}</li>)}</ul>
}`;

  const serverSnippet = `// 'use client' 없음 → 기본이 서버 컴포넌트
import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const supabase = await createClient()

  const { data: tests, error } = await supabase
    .from('tb_test')
    .select('*')

  if (error) throw error

  return (
    <ul>
      {tests?.map(p => (
        <li key={p.id}>{p.created_at}</li>
      ))}
    </ul>
  )
}`;

  const clientUtilsSnippet = `import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );`;

  const serverUtilsSnippet = `import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The 'setAll' method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  );
};`;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-800">Supabase 연동 테스트</h1>
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
            개발용
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          클라이언트 / 서버 컴포넌트에서 Supabase 데이터를 가져오는 패턴을 확인하세요. 팀원들이 기능
          개발 시 참고할 수 있습니다.
        </p>
      </div>

      {/* 환경 변수 안내 */}
      {!isEnvSet && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-800">환경 변수가 설정되지 않았습니다</p>
            <p className="mt-1 text-sm text-amber-700">
              프로젝트 루트에{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-amber-900">.env</code>를
              생성하고 아래 값을 추가한 뒤 개발 서버를 재시작하세요.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-amber-900/10 p-4 font-mono text-xs text-amber-900">
              {`NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...`}
            </pre>
            <p className="mt-2 text-xs text-amber-600">
              Supabase 대시보드 → Project Settings → API 에서 복사하세요.
            </p>
          </div>
        </div>
      )}

      {/* 클라이언트 / 서버 비교 패널 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── 클라이언트 컴포넌트 ── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
              &apos;use client&apos;
            </span>
            <h2 className="font-bold text-gray-800">클라이언트 컴포넌트</h2>
          </div>
          <p className="text-sm text-gray-500">
            브라우저에서 직접 Supabase를 호출합니다. 버튼 클릭 후 조회, 실시간 구독 등 인터랙티브한
            UI에 적합합니다.
          </p>

          {/* 코드 스니펫 */}
          <div className="overflow-hidden rounded-xl bg-gray-950">
            <div className="flex items-center gap-1.5 border-b border-gray-800 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="ml-2 font-mono text-xs text-gray-500">component.tsx</span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-gray-200">
              {clientSnippet}
            </pre>
          </div>

          {/* 라이브 테스트 */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">라이브 실행</p>
              <button
                onClick={runClientFetch}
                disabled={clientStatus === "loading"}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                {clientStatus === "loading" ? "조회 중..." : "실행"}
              </button>
            </div>

            {clientStatus === "idle" && (
              <p className="py-4 text-center text-sm text-gray-400">
                실행 버튼을 눌러 클라이언트에서 직접 데이터를 조회해보세요.
              </p>
            )}
            {clientStatus === "loading" && (
              <p className="animate-pulse py-4 text-center text-sm text-gray-500">
                Supabase에 연결 중...
              </p>
            )}
            {clientStatus === "success" && (
              <div>
                <p className="mb-2 text-xs font-semibold text-green-600">✓ 응답 성공</p>
                <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-3 font-mono text-xs text-gray-700">
                  {JSON.stringify(clientResult, null, 2)}
                </pre>
              </div>
            )}
            {clientStatus === "error" && (
              <div>
                <p className="mb-1 text-xs font-semibold text-red-600">✗ 오류 발생</p>
                <pre className="rounded-lg bg-red-50 p-3 font-mono text-xs whitespace-pre-wrap text-red-700">
                  {clientError}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* ── 서버 컴포넌트 ── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
              Server
            </span>
            <h2 className="font-bold text-gray-800">서버 컴포넌트</h2>
          </div>
          <p className="text-sm text-gray-500">
            서버에서 데이터를 미리 가져와 HTML에 포함합니다. 페이지 최초 로드 데이터, SEO가 중요한
            곳에 적합합니다.
          </p>

          {/* 코드 스니펫 */}
          <div className="overflow-hidden rounded-xl bg-gray-950">
            <div className="flex items-center gap-1.5 border-b border-gray-800 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="ml-2 font-mono text-xs text-gray-500">
                app/example/page.tsx (Server Component)
              </span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-gray-200">
              {serverSnippet}
            </pre>
          </div>

          {/* 사용 위치 안내 */}
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="mb-3 text-xs font-bold tracking-wide text-gray-500 uppercase">
              서버 컴포넌트를 쓸 수 있는 곳
            </p>
            <div className="space-y-2.5">
              {[
                {
                  file: "src/app/*/page.tsx",
                  desc: "라우트 페이지 — 기본이 서버 컴포넌트"
                },
                {
                  file: "src/app/*/layout.tsx",
                  desc: "레이아웃 — 공통 데이터 로딩"
                },
                {
                  file: "src/app/api/*/route.ts",
                  desc: "Route Handler — REST API 엔드포인트"
                }
              ].map(({ file, desc }) => (
                <div key={file} className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <div>
                    <code className="font-mono text-xs text-gray-800">{file}</code>
                    <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 주의사항 */}
          <div className="flex items-start gap-2.5 rounded-xl border border-yellow-100 bg-yellow-50 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <p className="text-xs text-yellow-800">
              서버 컴포넌트는 이 어드민 화면처럼{" "}
              <code className="rounded bg-yellow-100 px-1 font-mono">&apos;use client&apos;</code>가
              붙은 곳에서는 직접 실행할 수 없습니다.
              <br />
              <span className="mt-1 block">
                신규 페이지의 <code className="rounded bg-yellow-100 px-1 font-mono">page.tsx</code>
                에서 사용하세요.
              </span>
            </p>
          </div>

          {/* 실제 서버 조회 페이지 링크 */}
          <Link
            href="/supabase"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            <ExternalLink className="h-4 w-4" />
            서버 컴포넌트 실제 조회 결과 보기
          </Link>
        </div>
      </div>

      {/* RLS 안내 */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-500" />
          <h2 className="font-bold text-gray-800">RLS (Row Level Security) — 꼭 알아두기</h2>
        </div>
        <p className="text-sm text-gray-500">
          Supabase 테이블은 기본적으로 RLS가 켜져 있습니다. 정책(Policy)이 하나도 없으면, 권한이
          없는 행은{" "}
          <strong className="font-semibold text-gray-700">에러 없이 그냥 안 보입니다.</strong> 조회
          코드가 맞는데도 <code className="rounded bg-gray-100 px-1 font-mono">[]</code> 빈 배열만
          돌아온다면 거의 RLS 때문입니다.
        </p>

        {/* 증상 비교 */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="mb-1 text-xs font-bold text-red-700">정책이 없을 때</p>
            <p className="text-sm text-red-600">
              <code className="font-mono">error</code>는 <code className="font-mono">null</code>,{" "}
              <code className="font-mono">data</code>는 <code className="font-mono">[]</code> — 분명
              데이터가 있는데 0개로 조회됨
            </p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="mb-1 text-xs font-bold text-green-700">SELECT 정책 추가 후</p>
            <p className="text-sm text-green-600">
              <code className="font-mono">data</code>에 행이 정상적으로 채워짐
            </p>
          </div>
        </div>

        {/* 해결 SQL */}
        <p className="mt-5 mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
          해결 — SQL Editor에서 읽기 정책 추가
        </p>
        <div className="overflow-hidden rounded-xl bg-gray-950">
          <div className="flex items-center gap-1.5 border-b border-gray-800 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="ml-2 font-mono text-xs text-gray-500">SQL Editor</span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-gray-200">
            {`-- 모두에게 SELECT(읽기) 허용
create policy "Enable read access for all"
on public.tb_test
for select
to public          -- anon + authenticated 모두 포함
using (true);`}
          </pre>
        </div>

        {/* 대시보드 폼으로 추가하는 법 */}
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <p className="mb-3 text-xs font-bold tracking-wide text-gray-500 uppercase">
            또는 대시보드 폼으로 (Authentication → Policies → New Policy)
          </p>
          <div className="space-y-2">
            {[
              ["Policy Command", "SELECT"],
              ["Target Roles", "비워두기 (= public, 모두 허용)"],
              ["using 표현식", "true"]
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                <span className="text-gray-500">{label}:</span>
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-gray-800">
                  {value}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* 주의 */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-xs text-amber-800">
            <p>
              <strong className="font-semibold">
                비로그인 조회는 내부적으로 anon 역할로 실행됩니다.
              </strong>{" "}
              그래서 <code className="rounded bg-amber-100 px-1 font-mono">to public</code>{" "}
              (비워두기)을 권장합니다.{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">to authenticated</code>만
              지정하면 로그인 전에는 여전히 빈 배열이 나옵니다.
            </p>
            <p className="mt-1.5">
              실제 서비스 테이블에는{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">using (true)</code> 대신{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">auth.uid() = user_id</code> 같은
              조건으로 본인 데이터만 보이게 제한하세요. RLS 자체를 끄는 것(disable)은 테스트
              테이블이 아니면 권장하지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 유틸 파일 구조 */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-500" />
          <h2 className="font-bold text-gray-800">유틸 파일 구조</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            src/utils/supabase/
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {[
            {
              file: "client.ts",
              label: "브라우저용",
              labelColor: "bg-blue-100 text-blue-700",
              desc: "클라이언트 컴포넌트에서 import해서 사용합니다.",
              code: clientUtilsSnippet
            },
            {
              file: "server.ts",
              label: "서버용",
              labelColor: "bg-green-100 text-green-700",
              desc: "서버 컴포넌트 및 Route Handler에서 import해서 사용합니다.",
              code: serverUtilsSnippet
            }
          ].map(({ file, label, labelColor, desc, code }) => (
            <div key={file} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${labelColor}`}>
                  {label}
                </span>
                <code className="font-mono text-xs text-gray-500">src/utils/supabase/{file}</code>
              </div>
              <p className="text-sm text-gray-500">{desc}</p>
              <div className="overflow-hidden rounded-xl bg-gray-950">
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-gray-200">
                  {code}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 언제 뭘 쓸까 요약 */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-gray-800">언제 뭘 써야 할까?</h2>
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["", "클라이언트 컴포넌트", "서버 컴포넌트"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["import 경로", "@/utils/supabase/client", "@/utils/supabase/server"],
                ["함수 형태", "createClient() (동기)", "await createClient() (비동기)"],
                ["적합한 상황", "버튼 클릭 조회, 실시간 구독", "페이지 첫 로드, SEO 필요"],
                [
                  "주의사항",
                  "Publishable key가 브라우저에 노출됨",
                  "'use client' 파일에서 사용 불가"
                ]
              ].map(([label, client, server]) => (
                <tr key={label} className="border-b border-gray-50">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-500">{label}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-xs text-blue-800">
                      {client}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-xs text-green-800">
                      {server}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
