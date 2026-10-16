import assert from "node:assert/strict";
import test from "node:test";
import { clearChatSession, readChatSession, writeChatSession } from "./session.ts";

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    }
  };
}

const messages = [
  { id: 2, role: "user" as const, text: "휠체어로 갈 수 있는 곳" },
  {
    id: 3,
    role: "assistant" as const,
    content: {
      message: "출입구 정보를 확인해 주세요.",
      chips: ["다른 곳도 알려줘"],
      confidence: "medium" as const,
      sources: ["TourAPI"]
    }
  }
];

test("닫기 이후 같은 이용자의 대화와 작성 중 질문을 복원한다", () => {
  const store = storage();
  writeChatSession(store, "guest", { messages, input: "화장실은?" }, 1000);
  assert.deepEqual(readChatSession(store, "guest", 2000), { messages, input: "화장실은?" });
});

test("다른 계정에는 이전 대화를 노출하지 않고 저장본도 지운다", () => {
  const store = storage();
  writeChatSession(store, "member-a", { messages, input: "" }, 1000);
  assert.equal(readChatSession(store, "member-b", 2000), null);
  assert.equal(readChatSession(store, "member-a", 2000), null);
});

test("새 대화는 임시 저장본을 삭제한다", () => {
  const store = storage();
  writeChatSession(store, "guest", { messages, input: "" }, 1000);
  clearChatSession(store);
  assert.equal(readChatSession(store, "guest", 2000), null);
});

test("오래되거나 손상된 저장본은 복원하지 않는다", () => {
  const store = storage();
  writeChatSession(store, "guest", { messages, input: "" }, 1000);
  assert.equal(readChatSession(store, "guest", 1000 + 25 * 60 * 60 * 1000), null);
  writeChatSession(store, "guest", { messages, input: "" }, 1000);
  const key = [...store.values.keys()][0];
  store.setItem(key, "{broken");
  assert.equal(readChatSession(store, "guest", 2000), null);
});

test("잘못된 중첩 카드와 중복 메시지 식별자는 화면에 복원하지 않는다", () => {
  for (const invalid of [
    [{ ...messages[1], content: { ...messages[1].content, places: [{ title: "잘못된 카드" }] } }],
    [{ ...messages[1], content: { ...messages[1].content, accessibilityNeeds: "not-an-array" } }],
    [messages[0], messages[0]]
  ]) {
    const store = storage();
    writeChatSession(store, "guest", { messages, input: "" }, 1000);
    const key = [...store.values.keys()][0];
    const raw = JSON.parse(store.getItem(key)!);
    raw.messages = invalid;
    store.setItem(key, JSON.stringify(raw));
    assert.equal(readChatSession(store, "guest", 2000), null);
  }
});

test("임베딩 등 디버그 데이터는 저장하지 않고 최근 대화만 보관한다", () => {
  const store = storage();
  const longMessages = Array.from({ length: 120 }, (_, index) => ({
    ...messages[1],
    id: index + 1,
    content: { ...messages[1].content!, debug: { secret: "debug-not-for-storage" } }
  }));
  writeChatSession(store, "guest", { messages: longMessages as typeof messages, input: "" }, 1000);
  const restored = readChatSession(store, "guest", 2000)!;
  assert.ok(restored.messages.length <= 40);
  assert.equal(restored.messages.at(-1)?.id, 120);
  assert.equal([...store.values.values()].join("").includes("debug-not-for-storage"), false);
});

test("브라우저 저장소가 차단돼도 예외로 채팅을 중단하지 않는다", () => {
  const store = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("blocked");
    }
  };
  assert.equal(readChatSession(store, "guest"), null);
  assert.equal(writeChatSession(store, "guest", { messages, input: "" }), false);
  assert.doesNotThrow(() => clearChatSession(store));
});
