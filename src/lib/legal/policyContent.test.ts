import assert from "node:assert/strict";
import test from "node:test";
import { ACCOUNT_DELETION_EMAIL, accountDeletionPolicy, privacyPolicy } from "./policyContent.ts";

function allText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(allText).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value).map(allText).join(" ");
  }
  return "";
}

test("개인정보 처리방침은 실제 서비스에 필요한 핵심 안내를 제공한다", () => {
  const content = allText(privacyPolicy);

  assert.equal(privacyPolicy.title, "다대유 개인정보 처리방침");
  assert.match(content, /수집/u);
  assert.match(content, /이용 목적/u);
  assert.match(content, /보유/u);
  assert.match(content, /삭제|파기/u);
  assert.match(content, /안전/u);
  assert.match(content, /다대유/u);

  for (const forbidden of [
    "쉬운 말로 알려드릴게요",
    "운영 반영",
    "초안",
    "확정 필요",
    "시행 예정일"
  ]) {
    assert.doesNotMatch(content, new RegExp(forbidden, "u"));
  }
});

test("회원 탈퇴 안내는 실제 삭제 방식과 요청 이메일을 정확히 안내한다", () => {
  const content = allText(accountDeletionPolicy);

  assert.equal(ACCOUNT_DELETION_EMAIL, "dadaeyu.public@gmail.com");
  assert.equal(accountDeletionPolicy.title, "다대유 회원 탈퇴 및 계정 삭제 안내");
  assert.match(content, /마이페이지/u);
  assert.match(content, /회원 탈퇴/u);
  assert.match(content, /탈퇴합니다/u);
  assert.match(content, /익명 처리/u);
  assert.match(content, /게시글.*댓글/u);
  assert.match(content, /같은 이메일로 다시 가입/u);
  assert.doesNotMatch(content, /7일 이내|약 2분/u);
});
