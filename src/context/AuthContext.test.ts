import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./AuthContext.tsx", import.meta.url), "utf8");

test("탈퇴 상태 회원의 남은 클라이언트 세션을 종료한다", () => {
  assert.match(source, /m\?\.status === ["']withdrawn["']/u);
  assert.match(source, /auth\.signOut\(\)/u);
  assert.match(source, /setUser\(null\)/u);
  assert.match(source, /setSession\(null\)/u);
});

test("로그아웃 직전 시작된 회원 정보 요청은 로그아웃 이후 상태를 다시 채우지 않는다", () => {
  assert.match(source, /activeUserIdRef/u);
  assert.match(source, /loadGenerationRef/u);
  assert.match(source, /if \(\s*activeUserIdRef\.current !== userId/u);
  assert.match(source, /loadGenerationRef\.current \+= 1/u);
});

test("로그아웃 뒤 늦게 도착한 초기 세션 응답을 무시한다", () => {
  assert.match(source, /const sessionGeneration = loadGenerationRef\.current/u);
  assert.match(
    source,
    /getSession\(\)\.then\([\s\S]*loadGenerationRef\.current !== sessionGeneration[\s\S]*return/u
  );
});

test("의도적 로그아웃 이후에는 SIGNED_IN 전까지 user 세션을 다시 심지 않는다", () => {
  assert.match(source, /suppressStaleSessionRef/u);
  assert.match(source, /suppressStaleSessionRef\.current = true/u);
  assert.match(source, /suppressStaleSessionRef\.current && event !== ["']SIGNED_IN["']/u);
});
