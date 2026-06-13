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
  AlertCircle,
  FileText,
  ChevronRight
} from "lucide-react";
import { PLACES } from "@/data/placesData";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { genId } from "@/utils/id";

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
// 제보 상태 → Badge tone
const reportTone = (s: ReportStatus): "error" | "warn" | "brand" | "neutral" =>
  s === "대기" ? "error" : s === "검토중" ? "warn" : s === "반영됨" ? "brand" : "neutral";

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
      <aside className="border-hairline-soft hidden w-56 shrink-0 flex-col gap-0.5 border-r bg-white px-3 py-6 md:flex">
        <p className="text-stone mb-2 px-3 text-[10px] font-bold tracking-widest uppercase">
          관리자
        </p>
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const active = section === key;
          return (
            <button
              key={key}
              onClick={() => router.push(key === "dashboard" ? "/admin" : `/admin/${key}`)}
              className={`flex items-center gap-2.5 rounded-full px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                active
                  ? "bg-navy-50 text-navy-700"
                  : "text-steel hover:bg-surface-soft hover:text-ink"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-navy-600" : "text-stone"}`} />
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
        <div className="border-hairline-soft flex gap-1 overflow-x-auto border-b bg-white px-4 py-2 md:hidden">
          {SECTIONS.map(({ key, label, icon: Icon }) => {
            const active = section === key;
            return (
              <button
                key={key}
                onClick={() => router.push(key === "dashboard" ? "/admin" : `/admin/${key}`)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active ? "bg-navy-50 text-navy-700" : "text-steel hover:bg-surface-soft"
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
      bg: "bg-navy-50",
      color: "text-navy-600"
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
      bg: "bg-navy-50",
      color: "text-navy-600"
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
        <h1 className="text-ink text-xl font-bold">관리자 대시보드</h1>
        <p className="text-stone mt-0.5 text-sm">2026년 6월 3일 기준</p>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, delta, icon: Icon, bg, color }) => (
          <Card key={label} padding="none" className="border-hairline-soft p-5">
            <div className={`h-10 w-10 ${bg} mb-3 flex items-center justify-center rounded-lg`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-ink text-2xl font-bold">{value}</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-steel text-sm">{label}</p>
              <span
                className={`text-xs font-semibold ${delta === "처리필요" ? "text-error" : "text-annotate"}`}
              >
                {delta}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 주간 신규 가입 */}
        <div className="border-hairline-soft rounded-lg border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-ink font-bold">주간 신규 가입</h3>
            <TrendingUp className="text-brand-500 h-4 w-4" />
          </div>
          <div className="flex h-28 items-end gap-2">
            {weeklyData.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="bg-brand-400 w-full rounded-t-md transition-all"
                  style={{ height: `${(v / max) * 100}%` }}
                />
                <span className="text-stone text-[10px]">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 처리 필요 제보 */}
        <div className="border-hairline-soft rounded-lg border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-ink font-bold">처리 필요 제보</h3>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
              {recentReports.length}건
            </span>
          </div>
          <div className="space-y-3">
            {recentReports.length === 0 && (
              <p className="text-stone py-4 text-center text-sm">처리할 제보가 없어요 🎉</p>
            )}
            {recentReports.map((r) => (
              <div
                key={r.id}
                className="bg-surface-soft flex items-start justify-between gap-3 rounded-lg p-3"
              >
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold">{r.target}</p>
                  <p className="text-steel truncate text-xs">{r.content}</p>
                  <p className="text-stone mt-0.5 text-[10px]">
                    {r.user} · {r.date}
                  </p>
                </div>
                <Badge tone={reportTone(r.status)} className="shrink-0 font-semibold">
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 접근 권한 안내 */}
      <div className="border-navy-100 bg-navy-50 flex items-start gap-4 rounded-lg border p-5">
        <ShieldCheck className="text-navy-500 mt-0.5 h-8 w-8 shrink-0" />
        <div>
          <p className="text-navy-800 mb-1 font-bold">관리자 접근 권한</p>
          <p className="text-navy-600 text-sm">
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
        <h1 className="text-ink text-xl font-bold">유저 관리</h1>
        <span className="text-stone text-sm">총 {users.length}명</span>
      </div>

      <div className="relative">
        <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임 또는 이메일 검색"
          className="border-hairline focus:ring-navy-400 w-full rounded-lg border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-hairline-soft bg-surface-soft border-b">
                {["닉네임", "이메일", "가입일", "등급", "권한", "상태", "액션"].map((h) => (
                  <th
                    key={h}
                    className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
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
                  className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                >
                  <td className="text-ink px-4 py-3 font-semibold">{u.nickname}</td>
                  <td className="text-steel px-4 py-3 whitespace-nowrap">{u.email}</td>
                  <td className="text-stone px-4 py-3 whitespace-nowrap">{u.joined}</td>
                  <td className="px-4 py-3">
                    <span className="bg-surface text-steel rounded-full px-2 py-0.5 text-xs font-semibold">
                      {u.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRole(u.id)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                        u.role === "관리자"
                          ? "bg-navy-100 text-navy-700"
                          : "bg-surface text-steel hover:bg-navy-50 hover:text-navy-600"
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
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label="수정"
                      className="text-stone hover:bg-surface hover:text-steel rounded-full"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-stone py-8 text-center text-sm">검색 결과가 없어요</p>
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
        <h1 className="text-ink text-xl font-bold">장소 관리</h1>
        <button className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" />
          장소 등록
        </button>
      </div>

      <div className="relative">
        <Search className="text-stone absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="장소명 또는 카테고리 검색"
          className="border-hairline focus:ring-navy-400 w-full rounded-lg border py-2.5 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      <div className="border-hairline-soft overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-hairline-soft bg-surface-soft border-b">
                {["장소명", "카테고리", "평점", "접근성 태그", "액션"].map((h) => (
                  <th
                    key={h}
                    className="text-steel px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
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
                  className="border-hairline-soft hover:bg-surface-soft border-b transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="text-ink font-semibold">{p.name}</span>
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
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                      <span className="text-slate font-medium">{p.rating}</span>
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
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label="수정"
                        className="text-stone hover:bg-navy-50 hover:text-navy-600 rounded-full"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => deletePlace(p.id)}
                        aria-label="삭제"
                        className="text-stone rounded-full hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-stone py-8 text-center text-sm">검색 결과가 없어요</p>
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
        <h1 className="text-ink text-xl font-bold">코스 관리</h1>
        <button className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" />
          코스 등록
        </button>
      </div>

      <div className="flex gap-2">
        {(["전체", "베스트", "비공개"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${filter === f ? "bg-navy-600 text-white" : "bg-surface text-steel hover:bg-hairline"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="border-hairline-soft flex items-center gap-4 rounded-lg border bg-white px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-ink truncate font-semibold">{c.title}</h3>
                {c.best && (
                  <span className="bg-gold-100 text-gold-700 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    BEST
                  </span>
                )}
                {!c.visible && (
                  <span className="bg-surface text-steel shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    비공개
                  </span>
                )}
              </div>
              <p className="text-stone text-xs">
                {c.author} · {c.duration} · {c.places}곳 · {c.date}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* 베스트 토글 */}
              <button
                onClick={() => toggleBest(c.id)}
                title="베스트 코스 설정"
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  c.best
                    ? "border-gold-300 bg-gold-50 text-gold-700 hover:bg-gold-100"
                    : "border-hairline text-steel hover:border-gold-300 hover:text-gold-600 bg-white"
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${c.best ? "fill-yellow-400 text-yellow-500" : ""}`}
                />
                베스트
              </button>

              {/* 노출 토글 */}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => toggleVisible(c.id)}
                title="공개 여부 변경"
                aria-label="공개 여부 변경"
                className="text-stone hover:bg-surface hover:text-steel rounded-full"
              >
                {c.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="iconSm"
                aria-label="수정"
                className="text-stone hover:bg-navy-50 hover:text-navy-600 rounded-full"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => deleteCourse(c.id)}
                aria-label="삭제"
                className="text-stone rounded-full hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-stone py-10 text-center text-sm">해당하는 코스가 없어요</p>
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
        <h1 className="text-ink text-xl font-bold">제보 내용 확인</h1>
        <span className="text-stone text-sm">총 {reports.length}건</span>
      </div>

      {/* 상태 필터 */}
      <div className="flex flex-wrap gap-2">
        {(["전체", "대기", "검토중", "반영됨", "반려"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f ? "bg-navy-600 text-white" : "bg-surface text-steel hover:bg-hairline"
            }`}
          >
            {f}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filter === f ? "bg-white/20 text-white" : "text-steel bg-white"}`}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <Card key={r.id} className="border-hairline-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-ink font-bold">{r.target}</span>
                  <Badge tone={reportTone(r.status)} className="text-[10px] font-bold">
                    {r.status}
                  </Badge>
                </div>
                <p className="text-steel mb-1 text-sm">{r.content}</p>
                <p className="text-stone text-xs">
                  {r.user} · {r.date}
                </p>
              </div>

              {/* 상태 변경 액션 */}
              {(r.status === "대기" || r.status === "검토중") && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {r.status === "대기" && (
                    <button
                      onClick={() => setStatus(r.id, "검토중")}
                      className="border-gold-200 bg-gold-50 text-gold-700 hover:bg-gold-100 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                    >
                      검토 시작
                    </button>
                  )}
                  <button
                    onClick={() => setStatus(r.id, "반영됨")}
                    className="bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    반영
                  </button>
                  <button
                    onClick={() => setStatus(r.id, "반려")}
                    className="border-hairline bg-surface-soft text-steel flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                    반려
                  </button>
                </div>
              )}
              {(r.status === "반영됨" || r.status === "반려") && (
                <button
                  onClick={() => setStatus(r.id, "대기")}
                  className="text-stone hover:text-steel shrink-0 text-xs underline underline-offset-2"
                >
                  되돌리기
                </button>
              )}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-stone py-10 text-center text-sm">해당하는 제보가 없어요</p>
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
        id: `e${genId()}`,
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
        <h1 className="text-ink text-xl font-bold">이벤트 관리</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          이벤트 등록
        </button>
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div className="border-navy-100 bg-navy-50 space-y-3 rounded-lg border p-5">
          <p className="text-navy-800 text-sm font-bold">새 이벤트 등록</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-steel mb-1 block text-xs font-semibold">이모지</label>
              <input
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                className="border-hairline focus:ring-navy-400 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                placeholder="🎉"
              />
            </div>
            <div>
              <label className="text-steel mb-1 block text-xs font-semibold">배지</label>
              <input
                value={newBadge}
                onChange={(e) => setNewBadge(e.target.value)}
                className="border-hairline focus:ring-navy-400 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                placeholder="진행중"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-steel mb-1 block text-xs font-semibold">이벤트명</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="border-hairline focus:ring-navy-400 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                placeholder="이벤트 제목"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-steel mb-1 block text-xs font-semibold">기간</label>
              <input
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                className="border-hairline focus:ring-navy-400 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                placeholder="2026.07.01 – 07.31"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="border-hairline text-steel hover:bg-surface-soft rounded-full border px-4 py-2 text-sm"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="bg-navy-600 hover:bg-navy-700 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40"
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
            className={`flex items-center gap-4 rounded-lg border bg-white px-5 py-4 transition-opacity ${ev.visible ? "border-hairline-soft" : "border-hairline border-dashed opacity-60"}`}
          >
            <span className="shrink-0 text-2xl">{ev.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <h3 className="text-ink truncate font-semibold">{ev.title}</h3>
                <span className="bg-brand-100 text-brand-700 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {ev.badge}
                </span>
                {!ev.visible && (
                  <span className="bg-surface text-steel shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
                    숨김
                  </span>
                )}
              </div>
              <p className="text-stone text-xs">{ev.period}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => toggleVisible(ev.id)}
                title={ev.visible ? "노출 중지" : "노출 시작"}
                aria-label="노출 여부 변경"
                className={`rounded-full ${ev.visible ? "text-stone hover:bg-surface hover:text-steel" : "hover:bg-brand-50 hover:text-brand-500 text-stone"}`}
              >
                {ev.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="수정"
                className="text-stone hover:bg-navy-50 hover:text-navy-600 rounded-full"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => deleteEvent(ev.id)}
                aria-label="삭제"
                className="text-stone rounded-full hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
          <h1 className="text-ink text-xl font-bold">Supabase 연동 테스트</h1>
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
            개발용
          </span>
        </div>
        <p className="text-stone mt-1 text-sm">
          클라이언트 / 서버 컴포넌트에서 Supabase 데이터를 가져오는 패턴을 확인하세요. 팀원들이 기능
          개발 시 참고할 수 있습니다.
        </p>
      </div>

      {/* 환경 변수 안내 */}
      {!isEnvSet && (
        <div className="border-gold-200 bg-gold-50 flex items-start gap-3 rounded-lg border p-5">
          <AlertCircle className="text-gold-500 mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-gold-800 font-semibold">환경 변수가 설정되지 않았습니다</p>
            <p className="text-gold-700 mt-1 text-sm">
              프로젝트 루트에{" "}
              <code className="bg-gold-100 text-gold-900 rounded px-1 font-mono">.env</code>를
              생성하고 아래 값을 추가한 뒤 개발 서버를 재시작하세요.
            </p>
            <pre className="bg-gold-900/10 text-gold-900 mt-3 overflow-x-auto rounded-lg p-4 font-mono text-xs">
              {`NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...`}
            </pre>
            <p className="text-gold-600 mt-2 text-xs">
              Supabase 대시보드 → Project Settings → API 에서 복사하세요.
            </p>
          </div>
        </div>
      )}

      {/* 클라이언트 / 서버 비교 패널 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── 클라이언트 컴포넌트 ── */}
        <div className="border-navy-100 flex flex-col gap-4 rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2">
            <span className="bg-navy-100 text-navy-700 rounded-lg px-2.5 py-1 text-xs font-bold">
              &apos;use client&apos;
            </span>
            <h2 className="text-ink font-bold">클라이언트 컴포넌트</h2>
          </div>
          <p className="text-steel text-sm">
            브라우저에서 직접 Supabase를 호출합니다. 버튼 클릭 후 조회, 실시간 구독 등 인터랙티브한
            UI에 적합합니다.
          </p>

          {/* 코드 스니펫 */}
          <div className="bg-surface-code overflow-hidden rounded-lg">
            <div className="border-charcoal flex items-center gap-1.5 border-b px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="bg-gold-500 h-2.5 w-2.5 rounded-full" />
              <span className="bg-brand-500 h-2.5 w-2.5 rounded-full" />
              <span className="text-steel ml-2 font-mono text-xs">component.tsx</span>
            </div>
            <pre className="text-hairline overflow-x-auto p-4 font-mono text-xs leading-relaxed">
              {clientSnippet}
            </pre>
          </div>

          {/* 라이브 테스트 */}
          <div className="border-hairline-soft bg-surface-soft rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-slate text-sm font-semibold">라이브 실행</p>
              <button
                onClick={runClientFetch}
                disabled={clientStatus === "loading"}
                className="bg-navy-600 hover:bg-navy-700 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                {clientStatus === "loading" ? "조회 중..." : "실행"}
              </button>
            </div>

            {clientStatus === "idle" && (
              <p className="text-stone py-4 text-center text-sm">
                실행 버튼을 눌러 클라이언트에서 직접 데이터를 조회해보세요.
              </p>
            )}
            {clientStatus === "loading" && (
              <p className="text-steel animate-pulse py-4 text-center text-sm">
                Supabase에 연결 중...
              </p>
            )}
            {clientStatus === "success" && (
              <div>
                <p className="text-brand-600 mb-2 text-xs font-semibold">✓ 응답 성공</p>
                <pre className="border-hairline text-slate overflow-x-auto rounded-lg border bg-white p-3 font-mono text-xs">
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
        <div className="border-brand-100 flex flex-col gap-4 rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2">
            <span className="bg-brand-100 text-brand-700 rounded-lg px-2.5 py-1 text-xs font-bold">
              Server
            </span>
            <h2 className="text-ink font-bold">서버 컴포넌트</h2>
          </div>
          <p className="text-steel text-sm">
            서버에서 데이터를 미리 가져와 HTML에 포함합니다. 페이지 최초 로드 데이터, SEO가 중요한
            곳에 적합합니다.
          </p>

          {/* 코드 스니펫 */}
          <div className="bg-surface-code overflow-hidden rounded-lg">
            <div className="border-charcoal flex items-center gap-1.5 border-b px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="bg-gold-500 h-2.5 w-2.5 rounded-full" />
              <span className="bg-brand-500 h-2.5 w-2.5 rounded-full" />
              <span className="text-steel ml-2 font-mono text-xs">
                app/example/page.tsx (Server Component)
              </span>
            </div>
            <pre className="text-hairline overflow-x-auto p-4 font-mono text-xs leading-relaxed">
              {serverSnippet}
            </pre>
          </div>

          {/* 사용 위치 안내 */}
          <div className="bg-surface-soft rounded-lg p-4">
            <p className="text-steel mb-3 text-xs font-bold tracking-wide uppercase">
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
                  <FileText className="text-brand-500 mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <code className="text-ink font-mono text-xs">{file}</code>
                    <p className="text-steel mt-0.5 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 주의사항 */}
          <div className="border-gold-100 bg-gold-50 flex items-start gap-2.5 rounded-lg border p-4">
            <AlertCircle className="text-gold-600 mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-gold-800 text-xs">
              서버 컴포넌트는 이 어드민 화면처럼{" "}
              <code className="bg-gold-100 rounded px-1 font-mono">&apos;use client&apos;</code>가
              붙은 곳에서는 직접 실행할 수 없습니다.
              <br />
              <span className="mt-1 block">
                신규 페이지의 <code className="bg-gold-100 rounded px-1 font-mono">page.tsx</code>
                에서 사용하세요.
              </span>
            </p>
          </div>

          {/* 실제 서버 조회 페이지 링크 */}
          <Button asChild variant="accent">
            <Link href="/supabase">
              <ExternalLink className="h-4 w-4" />
              서버 컴포넌트 실제 조회 결과 보기
            </Link>
          </Button>
        </div>
      </div>

      {/* RLS 안내 */}
      <div className="border-hairline-soft rounded-lg border bg-white p-6">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="text-navy-500 h-5 w-5" />
          <h2 className="text-ink font-bold">RLS (Row Level Security) — 꼭 알아두기</h2>
        </div>
        <p className="text-steel text-sm">
          Supabase 테이블은 기본적으로 RLS가 켜져 있습니다. 정책(Policy)이 하나도 없으면, 권한이
          없는 행은{" "}
          <strong className="text-slate font-semibold">에러 없이 그냥 안 보입니다.</strong> 조회
          코드가 맞는데도 <code className="bg-surface rounded px-1 font-mono">[]</code> 빈 배열만
          돌아온다면 거의 RLS 때문입니다.
        </p>

        {/* 증상 비교 */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
            <p className="mb-1 text-xs font-bold text-red-700">정책이 없을 때</p>
            <p className="text-sm text-red-600">
              <code className="font-mono">error</code>는 <code className="font-mono">null</code>,{" "}
              <code className="font-mono">data</code>는 <code className="font-mono">[]</code> — 분명
              데이터가 있는데 0개로 조회됨
            </p>
          </div>
          <div className="border-brand-100 bg-brand-50 rounded-lg border p-4">
            <p className="text-brand-700 mb-1 text-xs font-bold">SELECT 정책 추가 후</p>
            <p className="text-brand-600 text-sm">
              <code className="font-mono">data</code>에 행이 정상적으로 채워짐
            </p>
          </div>
        </div>

        {/* 해결 SQL */}
        <p className="text-steel mt-5 mb-2 text-xs font-bold tracking-wide uppercase">
          해결 — SQL Editor에서 읽기 정책 추가
        </p>
        <div className="bg-surface-code overflow-hidden rounded-lg">
          <div className="border-charcoal flex items-center gap-1.5 border-b px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="bg-gold-500 h-2.5 w-2.5 rounded-full" />
            <span className="bg-brand-500 h-2.5 w-2.5 rounded-full" />
            <span className="text-steel ml-2 font-mono text-xs">SQL Editor</span>
          </div>
          <pre className="text-hairline overflow-x-auto p-4 font-mono text-xs leading-relaxed">
            {`-- 모두에게 SELECT(읽기) 허용
create policy "Enable read access for all"
on public.tb_test
for select
to public          -- anon + authenticated 모두 포함
using (true);`}
          </pre>
        </div>

        {/* 대시보드 폼으로 추가하는 법 */}
        <div className="bg-surface-soft mt-4 rounded-lg p-4">
          <p className="text-steel mb-3 text-xs font-bold tracking-wide uppercase">
            또는 대시보드 폼으로 (Authentication → Policies → New Policy)
          </p>
          <div className="space-y-2">
            {[
              ["Policy Command", "SELECT"],
              ["Target Roles", "비워두기 (= public, 모두 허용)"],
              ["using 표현식", "true"]
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Check className="text-brand-500 h-4 w-4 shrink-0" />
                <span className="text-steel">{label}:</span>
                <code className="text-ink rounded bg-white px-1.5 py-0.5 font-mono text-xs">
                  {value}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* 주의 */}
        <div className="border-gold-100 bg-gold-50 mt-4 flex items-start gap-2.5 rounded-lg border p-4">
          <AlertCircle className="text-gold-600 mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-gold-800 text-xs">
            <p>
              <strong className="font-semibold">
                비로그인 조회는 내부적으로 anon 역할로 실행됩니다.
              </strong>{" "}
              그래서 <code className="bg-gold-100 rounded px-1 font-mono">to public</code>{" "}
              (비워두기)을 권장합니다.{" "}
              <code className="bg-gold-100 rounded px-1 font-mono">to authenticated</code>만
              지정하면 로그인 전에는 여전히 빈 배열이 나옵니다.
            </p>
            <p className="mt-1.5">
              실제 서비스 테이블에는{" "}
              <code className="bg-gold-100 rounded px-1 font-mono">using (true)</code> 대신{" "}
              <code className="bg-gold-100 rounded px-1 font-mono">auth.uid() = user_id</code> 같은
              조건으로 본인 데이터만 보이게 제한하세요. RLS 자체를 끄는 것(disable)은 테스트
              테이블이 아니면 권장하지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 유틸 파일 구조 */}
      <div className="border-hairline-soft rounded-lg border bg-white p-6">
        <div className="mb-5 flex items-center gap-2">
          <Database className="text-navy-500 h-5 w-5" />
          <h2 className="text-ink font-bold">유틸 파일 구조</h2>
          <span className="bg-surface text-steel rounded-full px-2 py-0.5 text-xs">
            src/utils/supabase/
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {[
            {
              file: "client.ts",
              label: "브라우저용",
              labelColor: "bg-navy-100 text-navy-700",
              desc: "클라이언트 컴포넌트에서 import해서 사용합니다.",
              code: clientUtilsSnippet
            },
            {
              file: "server.ts",
              label: "서버용",
              labelColor: "bg-brand-100 text-brand-700",
              desc: "서버 컴포넌트 및 Route Handler에서 import해서 사용합니다.",
              code: serverUtilsSnippet
            }
          ].map(({ file, label, labelColor, desc, code }) => (
            <div key={file} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${labelColor}`}>
                  {label}
                </span>
                <code className="text-steel font-mono text-xs">src/utils/supabase/{file}</code>
              </div>
              <p className="text-steel text-sm">{desc}</p>
              <div className="bg-surface-code overflow-hidden rounded-lg">
                <pre className="text-hairline overflow-x-auto p-4 font-mono text-xs leading-relaxed">
                  {code}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 언제 뭘 쓸까 요약 */}
      <div className="border-hairline-soft rounded-lg border bg-white p-6">
        <h2 className="text-ink mb-4 font-bold">언제 뭘 써야 할까?</h2>
        <div className="border-hairline-soft overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-hairline-soft bg-surface-soft border-b">
                {["", "클라이언트 컴포넌트", "서버 컴포넌트"].map((h) => (
                  <th key={h} className="text-steel px-4 py-3 text-left text-xs font-bold">
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
                <tr key={label} className="border-hairline-soft border-b">
                  <td className="text-steel px-4 py-3 text-xs font-semibold">{label}</td>
                  <td className="px-4 py-3">
                    <code className="bg-navy-50 text-navy-800 rounded px-1.5 py-0.5 font-mono text-xs">
                      {client}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-brand-50 text-brand-800 rounded px-1.5 py-0.5 font-mono text-xs">
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
