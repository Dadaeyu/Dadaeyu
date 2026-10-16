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

test("답변을 기다리는 동안 헤더 상태가 로딩 중임을 안내한다", () => {
  assert.match(source, /isLoading\s*\?\s*"답변을 준비하고 있어요"/u);
});

test("채팅 자동 읽기는 전역 읽어주기 설정을 초기값으로 사용한다", () => {
  assert.match(source, /useAccessibility/u);
  assert.match(source, /readAloud/u);
  assert.match(source, /useState\(readAloud\)/u);
});

test("자동 읽기 버튼은 사용자 동작에서 TTS를 먼저 unlock 한다", () => {
  assert.match(source, /async function toggleAutoTts\(\)[\s\S]*await unlockTts\(\)/u);
  assert.match(source, /async function speakMessage[\s\S]*await unlockTts\(\)/u);
});

test("관련 코스 조회는 답변 말풍선을 먼저 추가한 뒤 별도로 붙인다", () => {
  assert.match(
    source,
    /setMessages\(\(current\) => \[\s*\.\.\.current,\s*\{ id: assistantMessageId, role: "assistant", content: data \}\s*\]\);\s*void loadRelatedCourses\(assistantMessageId, data, text\);/u
  );
  assert.match(
    source,
    /message\.id === messageId[\s\S]*content: \{ \.\.\.message\.content, courses \}/u
  );
});

test("응답 지연은 취소와 같은 질문 다시 시도를 제공한다", () => {
  assert.match(source, /function cancelRequest\(\)[\s\S]*controller\.abort\(\)/u);
  assert.match(source, /답변 요청을 취소했어요/u);
  assert.match(source, /같은 질문 다시 시도/u);
  assert.match(source, /onClick=\{\(\) => void sendMessage\(retryQuestion\)\}/u);
});
