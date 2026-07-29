/**
 * public 스키마 테이블명 (tb_ 접두사)
 */
export const T = {
  members: "tb_members",
  userPreferences: "tb_user_preferences",
  userFavorites: "tb_user_favorites",
  placeLikes: "tb_place_like",
  userPointEvents: "tb_user_point_events",
  courses: "tb_courses",
  course: "tb_course",
  courseDetail: "tb_course_detail",
  courseDays: "tb_course_days",
  courseDayPlaces: "tb_course_day_places",
  courseLikes: "tb_course_like",
  communityPosts: "tb_community_posts",
  communityComments: "tb_community_comments",
  postLikes: "tb_post_likes",
  placeReports: "tb_place_reports",
  places: "tb_places",
  place: "tb_place",
  placeReviews: "tb_place_reviews",
  adminMonthlySignups: "tb_admin_monthly_signups",
  test: "tb_test"
} as const;

export type TableName = (typeof T)[keyof typeof T];
