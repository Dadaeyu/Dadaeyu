import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./Chatbot.tsx", import.meta.url), "utf8");

test("모바일 채팅 입력줄은 입력창이 보이도록 음성 버튼 라벨을 작은 화면에서 숨긴다", () => {
  assert.match(source, /min-w-0\s+flex-1/u);
  assert.match(source, /w-12\s+min-w-12/u);
  assert.match(source, /hidden\s+min-\[390px\]:inline/u);
});

test("채팅 목록은 하단 안전 영역을 남겨 마지막 말풍선이 입력줄에 가려지지 않는다", () => {
  assert.match(source, /pb-\[max\(1\.25rem,env\(safe-area-inset-bottom\)\)\]/u);
});
