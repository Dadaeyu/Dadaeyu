export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended";
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
  members: "public.members.id → auth.users.id",
  courses: "courses.author_id → members.id",
  community_posts: "community_posts.author_id → members.id",
  community_comments: "community_comments.author_id → members.id",
  post_likes: "post_likes.user_id → members.id",
  place_reports: "place_reports.user_id → members.id",
  place_reviews: "place_reviews.user_id → members.id (nullable legacy rows)",
  user_favorites: "user_favorites.user_id → members.id",
} as const;

export const COMMUNITY_LEVEL_LABELS: Record<number, string> = {
  1: "새싹",
  2: "탐험가",
  3: "가이드",
  4: "전문가",
  5: "마스터",
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: "남성",
  female: "여성",
  undisclosed: "비공개",
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  "10s": "10대",
  "20s": "20대",
  "30s": "30대",
  "40s": "40대",
  "50s_plus": "50대+",
};

export function genderFromLabel(label: string): Gender {
  if (label === "남성") return "male";
  if (label === "여성") return "female";
  return "undisclosed";
}

export function genderToLabel(gender: Gender): string {
  return GENDER_LABELS[gender];
}

export function ageGroupFromLabel(label: string): AgeGroup | null {
  const map: Record<string, AgeGroup> = {
    "10대": "10s",
    "20대": "20s",
    "30대": "30s",
    "40대": "40s",
    "50대+": "50s_plus",
  };
  return map[label] ?? null;
}

export function ageGroupToLabel(age: AgeGroup | null): string {
  if (!age) return "미설정";
  return AGE_GROUP_LABELS[age];
}
