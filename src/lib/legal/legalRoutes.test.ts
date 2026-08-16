import assert from "node:assert/strict";
import test from "node:test";
import { LEGAL_LINKS, isPublicLegalPath } from "./legalRoutes.ts";

test("공개 정책 링크는 개인정보 처리방침과 회원 탈퇴 안내를 제공한다", () => {
  assert.deepEqual(LEGAL_LINKS, [
    { href: "/privacy", label: "개인정보 처리방침" },
    { href: "/account-deletion", label: "회원 탈퇴 안내" }
  ]);
});

test("정책 페이지는 로그인이나 온보딩 없이 열 수 있는 공개 경로다", () => {
  assert.equal(isPublicLegalPath("/privacy"), true);
  assert.equal(isPublicLegalPath("/account-deletion"), true);
  assert.equal(isPublicLegalPath("/mypage/settings/withdraw"), false);
});
