"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Star, Heart, Route, FileText, Pencil, Check, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchFavorites } from "@/lib/supabase/favorites";
import { fetchMyCourses } from "@/lib/supabase/courses";
import { fetchMyReports, REPORT_STATUS_LABELS } from "@/lib/supabase/reports";
import { fetchMyPosts } from "@/lib/supabase/community";
import {
  ageGroupFromLabel,
  ageGroupToLabel,
  COMMUNITY_LEVEL_LABELS,
  genderFromLabel,
  genderToLabel,
  type DbCourse,
  type DbPlaceReport,
  type DbCommunityPost,
} from "@/lib/supabase/types";
import { updateMember, updateUserPreferences, isNicknameAvailable, getNicknameSubmitError } from "@/lib/supabase/member";
import NicknameField from "@/components/NicknameField";
import { usePlaces } from "@/context/PlacesContext";

const ACCESS_OPTIONS = [
  { key: "시각", icon: "👁️" },
  { key: "청각", icon: "🦻" },
  { key: "보행", icon: "♿" },
];

const THEME_OPTIONS = ["빵지순례", "먹거리", "액티비티", "과학", "자연힐링", "문화예술", "역사근대", "축제"];

type TabKey = "saved" | "courses" | "posts" | "reports";

export default function MyPage() {
  const { user, member, preferences, signOut, refreshMember, loading: authLoading } = useAuth();
  const { places } = usePlaces();
  const router = useRouter();

  const [editingProfile, setEditingProfile] = useState(false);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | "비공개">("비공개");
  const [age, setAge] = useState("30대");
  const [access, setAccess] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>("saved");
  const [savedSubTab, setSavedSubTab] = useState<"places" | "courses">("places");
  const [savedPlaceIds, setSavedPlaceIds] = useState<number[]>([]);
  const [savedCourseIds, setSavedCourseIds] = useState<number[]>([]);
  const [myCourses, setMyCourses] = useState<DbCourse[]>([]);
  const [myPosts, setMyPosts] = useState<DbCommunityPost[]>([]);
  const [reports, setReports] = useState<DbPlaceReport[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [nicknameCanSubmit, setNicknameCanSubmit] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (member) {
      setNickname(member.nickname);
      setGender(genderToLabel(member.gender) as "남성" | "여성" | "비공개");
      setAge(ageGroupToLabel(member.age_group) === "미설정" ? "30대" : ageGroupToLabel(member.age_group));
    }
    if (preferences) {
      setAccess(preferences.accessibility_needs);
      setThemes(preferences.theme_preferences);
    }
  }, [member, preferences]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [favPlaces, favCourses, courses, posts, myReports] = await Promise.all([
        fetchFavorites(user.id, "place"),
        fetchFavorites(user.id, "course"),
        fetchMyCourses(user.id),
        fetchMyPosts(user.id),
        fetchMyReports(user.id),
      ]);
      setSavedPlaceIds(favPlaces.map((f) => f.target_id));
      setSavedCourseIds(favCourses.map((f) => f.target_id));
      setMyCourses(courses);
      setMyPosts(posts);
      setReports(myReports);
    } catch {
      // DB 미적용 시 빈 목록 유지
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const saveProfile = async () => {
    if (!user) return;

    const trimmed = nickname.trim();
    const available = await isNicknameAvailable(trimmed, user.id);
    const validationError = getNicknameSubmitError(trimmed, available);
    if (validationError) {
      setProfileError(validationError);
      return;
    }

    setSavingProfile(true);
    setProfileError(null);

    try {
      await updateMember(user.id, {
        nickname: trimmed,
        gender: genderFromLabel(gender),
        age_group: ageGroupFromLabel(age),
      });
      await refreshMember();
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async (nextAccess: string[], nextThemes: string[]) => {
    if (!user) return;
    try {
      await updateUserPreferences(user.id, {
        accessibility_needs: nextAccess,
        theme_preferences: nextThemes,
      });
      await refreshMember();
    } catch {
      // phase2(user_preferences) 미적용 시 UI만 로컬 반영
    }
  };

  const handleAccessToggle = (item: string) => {
    const next = access.includes(item) ? access.filter((x) => x !== item) : [...access, item];
    setAccess(next);
    savePreferences(next, themes);
  };

  const handleThemeToggle = (item: string) => {
    const next = themes.includes(item) ? themes.filter((x) => x !== item) : [...themes, item];
    setThemes(next);
    savePreferences(access, next);
  };

  const savedPlaces = places.filter((p) => savedPlaceIds.includes(p.id));
  const levelLabel = COMMUNITY_LEVEL_LABELS[member?.community_level ?? 1] ?? "새싹";
  const points = member?.community_points ?? 0;
  const nextLevelAt = member?.community_level === 5 ? points : [50, 200, 500, 1000][(member?.community_level ?? 1) - 1] ?? 50;
  const progressPct = member?.community_level === 5 ? 100 : Math.min(100, Math.round((points / nextLevelAt) * 100));

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "saved", label: "즐겨찾기", count: savedPlaceIds.length + savedCourseIds.length },
    { key: "courses", label: "내 코스", count: myCourses.length },
    { key: "posts", label: "내 글", count: myPosts.length },
    { key: "reports", label: "제보 이력", count: reports.length },
  ];

  if (authLoading) {
    return <div className="py-20 text-center text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => signOut().then(() => router.push("/"))}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <LogOut className="w-3.5 h-3.5" />
          로그아웃
        </button>
      </div>

      {/* 프로필 */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="h-20 bg-gradient-to-br from-navy-700 via-navy-600 to-brand-500" />
        <div className="px-5 md:px-6 pb-5 -mt-10">
          <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-md ring-4 ring-white flex items-center justify-center text-4xl shrink-0 overflow-hidden">
                {member?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              {!editingProfile && (
                <div className="pb-1">
                  <h2 className="text-xl font-bold text-gray-800">{member?.nickname ?? nickname}</h2>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{gender}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{age}</span>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (editingProfile) {
                  saveProfile();
                } else {
                  setProfileError(null);
                  setNicknameCanSubmit(false);
                  setEditingProfile(true);
                }
              }}
              disabled={editingProfile && (savingProfile || !nicknameCanSubmit)}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                editingProfile ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {editingProfile ? <><Check className="w-3.5 h-3.5" />{savingProfile ? "저장 중..." : "완료"}</> : <><Pencil className="w-3.5 h-3.5" />프로필 편집</>}
            </button>
          </div>

          {editingProfile && (
            <div className="grid sm:grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">닉네임</p>
                <NicknameField
                  value={nickname}
                  onChange={setNickname}
                  userId={user?.id}
                  initialNickname={member?.nickname}
                  onCanSubmitChange={setNicknameCanSubmit}
                  inputClassName="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">성별</p>
                <div className="flex gap-1.5">
                  {(["남성", "여성", "비공개"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
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
                  {["10대", "20대", "30대", "40대", "50대+"].map((a) => (
                    <button
                      key={a}
                      type="button"
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
          {editingProfile && profileError && (
            <p className="text-sm text-red-600 mt-2" role="alert">{profileError}</p>
          )}
        </div>
      </div>

      {/* 접근성 / 선호 테마 / 커뮤니티 점수 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-800 mb-1">접근성</h3>
          <p className="text-xs text-gray-400 mb-3">필요한 편의를 선택하면 맞춤 추천에 반영돼요</p>
          <div className="flex flex-wrap gap-2">
            {ACCESS_OPTIONS.map(({ key, icon }) => {
              const on = access.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleAccessToggle(key)}
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

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-800 mb-1">선호 테마</h3>
          <p className="text-xs text-gray-400 mb-3">관심 있는 테마를 모두 선택해 주세요</p>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map((theme) => {
              const on = themes.includes(theme);
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => handleThemeToggle(theme)}
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

        <div className="bg-gradient-to-br from-navy-600 to-brand-500 rounded-2xl p-5 text-white shadow-md shadow-navy-600/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white/90">커뮤니티 점수</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/20">
              Lv.{member?.community_level ?? 1} {levelLabel}
            </span>
          </div>
          <div className="text-3xl font-bold mb-3">{points}<span className="text-base font-medium text-white/70"> P</span></div>
          <div className="w-full bg-white/20 rounded-full h-2 mb-2">
            <div className="bg-gold-400 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-white/80">
            {member?.community_level === 5
              ? "최고 등급에 도달했어요!"
              : `다음 등급까지 ${Math.max(0, nextLevelAt - points)}P`}
          </p>
        </div>
      </div>

      {/* 목록 탭 */}
      <div className="space-y-4">
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
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

        {dataLoading && <p className="text-sm text-gray-400 text-center py-6">불러오는 중...</p>}

        {!dataLoading && activeTab === "saved" && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {([
                { key: "places" as const, label: "장소", count: savedPlaces.length },
                { key: "courses" as const, label: "코스", count: savedCourseIds.length },
              ]).map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
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

            {savedSubTab === "places" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedPlaces.map((place) => (
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
                    <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400 shrink-0" />
                  </Link>
                ))}
                {savedPlaces.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-full text-center py-8">저장한 장소가 없어요</p>
                )}
              </div>
            )}

            {savedSubTab === "courses" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedCourseIds.map((id) => (
                  <Link
                    key={id}
                    href={`/course/${id}`}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                        <Route className="w-5 h-5 text-purple-500" />
                      </div>
                      <h4 className="font-semibold text-gray-800 truncate">코스 #{id}</h4>
                    </div>
                    <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                  </Link>
                ))}
                {savedCourseIds.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-full text-center py-8">저장한 코스가 없어요</p>
                )}
              </div>
            )}
          </div>
        )}

        {!dataLoading && activeTab === "courses" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myCourses.map((course) => (
              <Link
                key={course.id}
                href={`/course/${course.id}`}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                    <Route className="w-4 h-4 text-brand-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 truncate">{course.title}</h4>
                </div>
                <p className="text-sm text-gray-500">
                  {course.duration_label ?? "일정 미정"} · {course.is_public ? "공개" : "비공개"}
                </p>
              </Link>
            ))}
            {myCourses.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full text-center py-8">만든 코스가 없어요</p>
            )}
          </div>
        )}

        {!dataLoading && activeTab === "posts" && (
          <div className="space-y-3">
            {myPosts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brand-100 text-brand-700">
                    {post.post_type}
                  </span>
                  <h4 className="font-semibold text-gray-800 truncate">{post.title}</h4>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{post.like_count}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{post.comment_count}</span>
                </div>
              </Link>
            ))}
            {myPosts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">작성한 글이 없어요</p>
            )}
          </div>
        )}

        {!dataLoading && activeTab === "reports" && (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 truncate">{report.target_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      report.status === "approved" ? "bg-brand-100 text-brand-700" : "bg-gold-100 text-gold-700"
                    }`}>
                      {REPORT_STATUS_LABELS[report.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{report.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(report.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                {report.points_awarded > 0 && (
                  <div className="text-brand-600 font-bold shrink-0">+{report.points_awarded}P</div>
                )}
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">제보 이력이 없어요</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
