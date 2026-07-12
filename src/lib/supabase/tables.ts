/**
 * public 스키마 테이블명 (tb_ 접두사)
 */
export const T = {
  members: "tb_members",
  userPreferences: "tb_user_preferences",
  userFavorites: "tb_user_favorites",
  userPointEvents: "tb_user_point_events",
  courses: "tb_courses",
  courseDays: "tb_course_days",
  courseDayPlaces: "tb_course_day_places",
  communityPosts: "tb_community_posts",
  communityComments: "tb_community_comments",
  postLikes: "tb_post_likes",
  placeReports: "tb_place_reports",
  places: "tb_places",
  placeReviews: "tb_place_reviews",
  adminMonthlySignups: "tb_admin_monthly_signups",
  test: "tb_test"
} as const;

export type TableName = (typeof T)[keyof typeof T];
