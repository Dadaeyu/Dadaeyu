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
