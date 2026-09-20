const COMMUNITY_POST_RETURN_PATH = /^\/community\/\d+$/u;

export function parseCommunityPostReturnPath(value: string | null | undefined): string | null {
  const path = value?.trim() ?? "";
  return COMMUNITY_POST_RETURN_PATH.test(path) ? path : null;
}

export function buildCourseHrefFromCommunityPost(courseId: number, postId: number) {
  const params = new URLSearchParams();
  params.set("from", `/community/${postId}`);
  return `/course/${courseId}?${params.toString()}`;
}
