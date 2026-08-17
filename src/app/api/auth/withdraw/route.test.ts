import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeSource = await readFile(new URL("./route.ts", import.meta.url), "utf8");

test("회원 탈퇴 시 공개 프로필 이미지 파일을 스토리지에서 제거한다", () => {
  assert.match(routeSource, /storage\.from\(["']avatars["']\)/u);
  assert.match(routeSource, /avatarBucket\.list\(user\.id/u);
  assert.match(routeSource, /avatarBucket\.remove\(avatarPaths\)/u);
});

test("회원 탈퇴 시 기존 게시글의 저장된 작성자명도 익명화한다", () => {
  assert.match(routeSource, /from\(T\.boardPosts\)[\s\S]*writer_nm:\s*anonNickname/u);
  assert.match(routeSource, /eq\(["']writer_id["'],\s*user\.id\)/u);
});

test("회원 탈퇴 데이터 정리 오류를 무시하지 않는다", () => {
  for (const errorName of [
    "resetPreferencesError",
    "deleteFavoritesError",
    "deletePlaceLikesError",
    "deleteCourseLikesError",
    "deletePostLikesError"
  ]) {
    assert.match(routeSource, new RegExp(`if \\(${errorName}\\)`, "u"));
  }
});

test("회원 탈퇴 시 게시글 좋아요 기록도 삭제한다", () => {
  assert.match(routeSource, /from\(T\.postLikes\)\.delete\(\)\.eq\(["']user_id["'],\s*user\.id\)/u);
});

test("탈퇴 상태가 된 뒤 오류가 나도 현재 세션을 종료한다", () => {
  assert.match(
    routeSource,
    /if \(authError\)[\s\S]*await supabase\.auth\.signOut\(\)[\s\S]*return jsonError/u
  );
});
