export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended" | "withdrawn";
export type Gender = "male" | "female" | "undisclosed";
export type AgeGroup = "10s" | "20s" | "30s" | "40s" | "50s_plus";
export type FavoriteTargetType = "place" | "course";
export type ReportStatus = "pending" | "reviewing" | "approved" | "rejected";
export type PostType = "review" | "tip" | "share";

export interface DbMember {
  id: string;
  nickname: string;
  phone: string | null;
  avatar_url: string | null;
  gender: Gender;
  age_group: AgeGroup | null;
  role: UserRole;
  status: UserStatus;
  community_points: number;
  community_level: number;
  onboarding_completed: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserPreferences {
  user_id: string;
  accessibility_needs: string[];
  theme_preferences: string[];
  dark_mode: boolean;
  high_contrast: boolean;
  font_scale: number;
  read_aloud: boolean;
  updated_at: string;
}

export interface DbUserFavorite {
  id: number;
  user_id: string;
  target_type: FavoriteTargetType;
  target_id: number;
  created_at: string;
}

export interface DbPlaceLike {
  like_id: number;
  user_id: string;
  /** 관광 contentid가 들어 있는 경우가 있음 (컬럼명 place_id) */
  place_id: number;
  registtime: string;
}

/** 마이페이지 좋아요 목록 표시용 (tb_place 조인) */
export interface LikedPlace {
  like_id: number;
  place_id: number;
  contentid: string;
  title: string;
  addr1: string | null;
  firstimage: string | null;
  lat: number | null;
  lng: number | null;
  registtime: string;
}

/** tb_course_like */
export interface DbCourseLike {
  like_id: number;
  user_id: string;
  course_id: number;
  registtime: string;
}

/** 마이페이지 코스 좋아요 표시용 (tb_course 조인) */
export interface LikedCourse {
  like_id: number;
  course_id: number;
  title: string;
  startdate: string | null;
  enddate: string | null;
  registtime: string;
}

/** tb_course_detail + tb_place 조인 결과 */
export interface TourismCoursePlace {
  detail_id: number;
  place_id: number;
  day: number;
  starttime: string | null;
  endtime: string | null;
  title: string;
  addr1: string | null;
  firstimage: string | null;
  contentid: string | null;
}

/** 내가 만든 코스 (tb_course.register = auth.uid) */
export interface TourismMyCourse {
  course_id: number;
  course_nm: string;
  open_yn: string | null;
  startdate: string | null;
  enddate: string | null;
  register: string | null;
  registtime: string | null;
  places: TourismCoursePlace[];
  day_count: number;
  place_count: number;
}

/** @deprecated 원격에는 tb_courses 없음 — TourismMyCourse 사용 */
export interface DbCourse {
  id: number;
  author_id: string | null;
  title: string;
  description: string | null;
  duration_label: string | null;
  is_public: boolean;
  is_best: boolean;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbPlaceReport {
  id: number;
  user_id: string;
  place_id: number | null;
  target_name: string;
  content: string;
  status: ReportStatus;
  points_awarded: number;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DbCommunityPost {
  id: number;
  author_id: string;
  post_type: PostType;
  title: string;
  content: string;
  attached_place_id: number | null;
  attached_course_id: number | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbPlace {
  id: number;
  name: string;
  lat?: number | null;
  lng?: number | null;
  cx: number;
  cy: number;
  color: string;
  bg: string;
  category: string;
  rating: number;
  accessibility: string[];
  distance: string | null;
  emoji: string | null;
  hot: boolean;
  description: string | null;
  tags: string[] | null;
  address: string | null;
  hours: string | null;
  phone: string | null;
}

export interface DbBoard {
  board_id: number;
  board_nm: string;
  board_desc: string | null;
  board_type: string;
  sort_order: number;
  use_yn: boolean;
  comment_yn: boolean;
  reply_yn: boolean;
  allow_image: boolean;
  allow_file: boolean;
  allow_secret: boolean;
  max_upload_count: number;
  category_yn: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPost {
  post_id: number;
  board_id: number;
  title: string;
  content: string;
  writer_id: string | null;
  writer_nm: string;
  rating: number | null;
  view_cnt: number;
  like_cnt: number;
  comment_cnt: number;
  notice_yn: boolean;
  use_yn: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPlaceReview {
  id: number;
  place_id: number;
  user_id: string | null;
  user_name: string;
  rating: number;
  content: string;
  review_date: string;
}

/** 팀 연동용: 비즈니스 테이블 author/user FK 계약 */
export const USER_FK_CONTRACT = {
  members: "public.tb_members.id → auth.users.id",
  courses:
    "tb_course.register = auth.users.id (text UUID); detail → tb_course_detail.place_id → tb_place.place_id",
  community_posts: "tb_community_posts.author_id → tb_members.id",
  community_comments: "tb_community_comments.author_id → tb_members.id",
  post_likes: "tb_post_likes.user_id → tb_members.id",
  place_reports: "tb_place_reports.user_id → tb_members.id",
  place_reviews: "tb_place_reviews.user_id → tb_members.id (nullable legacy rows)",
  user_favorites: "tb_user_favorites.user_id → tb_members.id",
  place_likes: "tb_place_like.user_id → tb_members.id; place_id 컬럼에는 tb_place.contentid 저장",
  course_likes: "tb_course_like.user_id → tb_members.id; course_id → tb_course.course_id"
} as const;

export {
  COMMUNITY_LEVEL_LABELS,
  COMMUNITY_MAX_LEVEL,
  COMMUNITY_LEVEL_THRESHOLDS
} from "@/lib/community/levels";

export const GENDER_LABELS: Record<Gender, string> = {
  male: "남성",
  female: "여성",
  undisclosed: "비공개"
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  "10s": "10대",
  "20s": "20대",
  "30s": "30대",
  "40s": "40대",
  "50s_plus": "50대+"
};

/** UI 선택지 (비공개 = DB null, 성별 undisclosed와 동일 의미) */
export const AGE_GROUP_UI_OPTIONS = ["10대", "20대", "30대", "40대", "50대+", "비공개"] as const;
export type AgeGroupUiLabel = (typeof AGE_GROUP_UI_OPTIONS)[number];

export function genderFromLabel(label: string): Gender {
  if (label === "남성") return "male";
  if (label === "여성") return "female";
  return "undisclosed";
}

export function genderToLabel(gender: Gender): string {
  return GENDER_LABELS[gender];
}

export function ageGroupFromLabel(label: string): AgeGroup | null {
  if (label === "비공개" || label === "미설정") return null;
  const map: Record<string, AgeGroup> = {
    "10대": "10s",
    "20대": "20s",
    "30대": "30s",
    "40대": "40s",
    "50대+": "50s_plus"
  };
  return map[label] ?? null;
}

export function ageGroupToLabel(age: AgeGroup | null): string {
  if (!age) return "비공개";
  return AGE_GROUP_LABELS[age];
}
