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

test("질문 전송은 기존 음성을 정리한 뒤 TTS 재생 권한을 연다", () => {
  assert.match(
    source,
    /async function sendMessage[\s\S]*abortVoiceInput\(\);\s*stopSpeech\(\);\s*const ttsUnlockPromise[\s\S]*unlockTts\(\)[\s\S]*await ttsUnlockPromise/u
  );
});

test("전역 읽어주기가 켜져 있으면 타이핑으로 보낸 질문도 한 번 읽는다", () => {
  assert.match(
    source,
    /const shouldReadTypedQuestion = readAloud && !options\.continueConversation/u
  );
  assert.match(source, /shouldReadTypedQuestion[\s\S]*startSpeech\(userMessageId, text\)/u);
});
