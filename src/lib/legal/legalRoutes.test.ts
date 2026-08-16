import assert from "node:assert/strict";
import test from "node:test";
import { LEGAL_LINKS, isPublicLegalPath, shouldShowGlobalLegalFooter } from "./legalRoutes.ts";

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

test("공통 정책 푸터는 일반 화면에만 노출한다", () => {
  for (const pathname of ["/", "/community", "/community/12", "/mypage"]) {
    assert.equal(
      shouldShowGlobalLegalFooter(pathname),
      true,
      `${pathname}에서 푸터를 노출해야 합니다.`
    );
  }

  for (const pathname of [
    "/privacy",
    "/account-deletion",
    "/login",
    "/signup",
    "/signup/check-email",
    "/forgot-password",
    "/find-email",
    "/auth/confirm",
    "/auth/reset-password",
    "/map",
    "/course",
    "/course/12"
  ]) {
    assert.equal(
      shouldShowGlobalLegalFooter(pathname),
      false,
      `${pathname}에서 중복 또는 방해되는 푸터를 숨겨야 합니다.`
    );
  }
});
