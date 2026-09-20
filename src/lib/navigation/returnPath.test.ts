import assert from "node:assert/strict";
import test from "node:test";
import { buildCourseHrefFromCommunityPost, parseCommunityPostReturnPath } from "./returnPath.ts";

test("커뮤니티 게시글에서 연 코스는 그 글로 돌아갈 경로만 받는다", () => {
  assert.equal(parseCommunityPostReturnPath("/community/42"), "/community/42");
  assert.equal(parseCommunityPostReturnPath(" /community/42 "), "/community/42");
  assert.equal(parseCommunityPostReturnPath("/community/new"), null);
  assert.equal(parseCommunityPostReturnPath("/course"), null);
  assert.equal(parseCommunityPostReturnPath("https://example.com"), null);
  assert.equal(buildCourseHrefFromCommunityPost(9, 42), "/course/9?from=%2Fcommunity%2F42");
});
