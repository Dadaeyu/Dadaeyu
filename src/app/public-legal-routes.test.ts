import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

async function readRoute(route: "privacy" | "account-deletion") {
  return readFile(path.join(projectRoot, "src", "app", route, "page.tsx"), "utf8");
}

async function readProjectFile(...segments: string[]) {
  return readFile(path.join(projectRoot, ...segments), "utf8");
}

function assertPublicServerPage(source: string) {
  assert.match(source, /policyContent/u);
  assert.match(source, /export const metadata/u);
  assert.doesNotMatch(
    source,
    /requireLogin|AuthContext|createServerClient|redirect\s*\(/u,
    "공개 정책 페이지는 로그인이나 서버 인증에 의존하면 안 됩니다."
  );
}

test("개인정보 처리방침은 공개 정적 페이지로 제공된다", async () => {
  assertPublicServerPage(await readRoute("privacy"));
});

test("회원 탈퇴 안내는 공개 정적 페이지로 제공된다", async () => {
  const source = await readRoute("account-deletion");
  assertPublicServerPage(source);
  assert.match(source, /accountDeletionPolicy/u);
});

test("정책 페이지는 이메일 미인증 세션에서도 공개된다", async () => {
  const proxySource = await readProjectFile("src", "proxy.ts");

  assert.match(
    proxySource,
    /!isPublicLegalPath\(pathname\)[\s\S]*checkEmailUrl\.pathname\s*=\s*["']\/signup\/check-email["']/u
  );
});

test("보호 화면에서는 탈퇴 상태 세션을 즉시 차단한다", async () => {
  const proxySource = await readProjectFile("src", "proxy.ts");

  assert.match(proxySource, /member\?\.status === ["']withdrawn["']/u);
  assert.match(proxySource, /account_withdrawn/u);
});

test("모바일 단계 번호는 다크 모드에서도 충분한 대비를 사용한다", async () => {
  const shellSource = await readProjectFile("src", "components", "legal", "LegalPageShell.tsx");

  assert.match(shellSource, /bg-brand-700/u);
  assert.match(shellSource, /text-white/u);
  assert.doesNotMatch(shellSource, /bg-brand-500 text-ink inline-flex h-8 w-8/u);
});

test("모바일 정책 화면은 고정 주 메뉴가 긴 문서를 가리지 않는다", async () => {
  const rootShellSource = await readProjectFile("src", "components", "RootShell.tsx");

  assert.match(rootShellSource, /isPublicLegalPath\(pathname\)/u);
  assert.match(rootShellSource, /!isLegalPage\s*&&\s*<MobileNav\s*\/>/u);
});

test("일반 화면은 하단 공통 푸터에서 공개 정책 링크를 제공한다", async () => {
  const rootShellSource = await readProjectFile("src", "components", "RootShell.tsx");

  assert.match(rootShellSource, /LegalLinks/u);
  assert.match(rootShellSource, /shouldShowGlobalLegalFooter\(pathname\)/u);
  assert.match(rootShellSource, /showGlobalLegalFooter\s*&&\s*\([\s\S]*<footer/u);
  assert.match(rootShellSource, /<LegalLinks/u);
  assert.match(rootShellSource, /<footer[^>]*className="[^"]*pb-24[^"]*"/u);
});

test("모바일 문서 목차는 잘린 가로 버튼 대신 펼쳐서 확인한다", async () => {
  const shellSource = await readProjectFile("src", "components", "legal", "LegalPageShell.tsx");

  assert.match(shellSource, /<details/u);
  assert.match(shellSource, /<summary[^>]*>[\s\S]*문서 목차/u);
  assert.doesNotMatch(shellSource, /overflow-x-auto/u);
});

test("설정 화면은 소셜 로그인 재가입 예외를 함께 안내한다", async () => {
  const accountSource = await readProjectFile(
    "src",
    "components",
    "screens",
    "mypage-settings",
    "AccountSection.tsx"
  );

  assert.match(accountSource, /이메일 가입/u);
  assert.match(accountSource, /소셜 로그인/u);
});
