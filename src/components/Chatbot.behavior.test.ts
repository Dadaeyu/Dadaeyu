import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import * as session from "../lib/chat/session.ts";
import * as discovery from "../lib/chat/discoveryLinks.ts";
import * as presentation from "../lib/chat/presentation.ts";
import * as scroll from "../lib/chat/scrollTarget.ts";
import * as evidence from "../lib/chat/accessibilityEvidence.ts";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("./Chatbot.tsx", import.meta.url), "utf8");

async function harness(options: { unlock?: () => Promise<boolean> } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: "https://example.test" });
  const previous = { window: globalThis.window, document: globalThis.document };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true
  });
  dom.window.HTMLElement.prototype.scrollTo = () => {};
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  let auth = { user: null as null | { id: string }, loading: false };
  let resolveAnswer: (value: unknown) => void = () => {};
  let rejectAnswer: (reason: unknown) => void = () => {};
  const requests: { url: string; init: RequestInit }[] = [];
  const speakCalls: string[] = [];
  const ttsEvents: string[] = [];
  const tts = {
    status: "idle",
    isAvailable: true,
    stop() {
      ttsEvents.push("stop");
    },
    unlock: () => {
      ttsEvents.push("unlock");
      return options.unlock?.() ?? Promise.resolve(true);
    },
    speak: async ({ text }: { text: string }) => {
      ttsEvents.push("speak");
      speakCalls.push(text);
    }
  };
  const modules: Record<string, unknown> = {
    "@/context/AccessibilityContext": { useAccessibility: () => ({ readAloud: true }) },
    "@/context/AuthContext": { useAuth: () => auth },
    "@/hooks/useTextToSpeech": { useTextToSpeech: () => tts },
    "@/lib/chat/session": session,
    "@/lib/chat/discoveryLinks": discovery,
    "@/lib/chat/presentation": presentation,
    "@/lib/chat/scrollTarget": scroll,
    "@/lib/chat/accessibilityEvidence": evidence,
    "@/lib/chat/client-request": {
      requestChatJson: (url: string, init: RequestInit) => {
        requests.push({ url, init });
        return url === "/api/chat"
          ? new Promise((resolve, reject) => {
              resolveAnswer = resolve;
              rejectAnswer = reject;
            })
          : Promise.resolve({ items: [] });
      }
    },
    "@/features/home/HomePlaceImage": { HomePlaceImage: () => null },
    "next/image": () => null,
    "next/link": ({ children, ...props }: Record<string, unknown>) =>
      React.createElement("a", props, children as React.ReactNode)
  };
  const output: { default?: React.ComponentType<{ onClose: () => void }> } = {};
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true
      }
    }).outputText,
    {
      exports: output,
      require: (id: string) => modules[id] ?? require(id),
      window: dom.window,
      document: dom.window.document,
      AbortController,
      console,
      setTimeout,
      clearTimeout
    }
  );
  const root = createRoot(dom.window.document.getElementById("root")!);
  const render = async () => {
    await act(async () =>
      root.render(React.createElement(output.default!, { onClose: () => root.render(null) }))
    );
  };
  await render();
  const click = async (label: string) => {
    const button = [...dom.window.document.querySelectorAll("button")].find(
      (node) => node.getAttribute("aria-label") === label || node.textContent === label
    );
    assert.ok(button, `button missing: ${label}`);
    await act(async () => button.click());
  };
  return {
    dom,
    requests,
    speakCalls,
    ttsEvents,
    render,
    click,
    text: () => dom.window.document.body.textContent ?? "",
    answer: async (response: unknown) => {
      await act(async () => {
        resolveAnswer(response);
      });
    },
    fail: async () => {
      await act(async () => rejectAnswer(new Error("request failed")));
    },
    switchUser: async (id: string) => {
      auth = { user: { id }, loading: false };
      await render();
    },
    cleanup: async () => {
      await act(async () => root.unmount());
      dom.window.close();
      Object.assign(globalThis, previous);
    }
  };
}

const answer = {
  message: "복원할 실제 답변입니다.",
  chips: ["화장실은?"],
  confidence: "medium",
  sources: []
};

test("실제 챗봇을 닫고 다시 열면 대화를 복원하며 자동 음성을 다시 재생하지 않는다", async () => {
  const h = await harness();
  try {
    await h.click("다대유는 어떤 사이트야?");
    await h.answer(answer);
    assert.match(h.text(), /복원할 실제 답변/);
    const speechCount = h.speakCalls.length;
    await h.click("채팅창 닫기");
    await h.render();
    assert.match(h.text(), /복원할 실제 답변/);
    assert.equal(h.speakCalls.length, speechCount);
    await h.click("화장실은?");
    const sent = JSON.parse(String(h.requests.at(-1)?.init.body));
    assert.ok(sent.history.some((entry: { content: string }) => entry.content === answer.message));
  } finally {
    await h.cleanup();
  }
});

test("새 대화는 진행 중 요청을 취소하고 늦은 응답을 무시한다", async () => {
  const h = await harness();
  try {
    await h.click("다대유는 어떤 사이트야?");
    const signal = h.requests[0].init.signal;
    await h.click("이전 대화를 지우고 새 대화 시작");
    assert.equal(signal?.aborted, true);
    await h.answer(answer);
    assert.doesNotMatch(h.text(), /복원할 실제 답변/);
    await h.click("채팅창 닫기");
    await h.render();
    assert.doesNotMatch(h.text(), /복원할 실제 답변/);
  } finally {
    await h.cleanup();
  }
});

test("닫으면서 중단된 질문은 복원 후 중복 메시지 없이 재시도한다", async () => {
  const h = await harness();
  try {
    await h.click("다대유는 어떤 사이트야?");
    await h.click("채팅창 닫기");
    await h.render();
    assert.match(h.text(), /이전 질문의 답변이 완료되지/);
    await h.click("같은 질문 다시 시도");
    const sent = JSON.parse(String(h.requests.at(-1)?.init.body));
    assert.equal(
      sent.history.some(
        (entry: { role: string; content: string }) =>
          entry.role === "user" && entry.content === sent.message
      ),
      false
    );
    await h.answer(answer);
    const saved = session.readChatSession(h.dom.window.sessionStorage, "guest")!;
    assert.equal(saved.messages.filter((message) => message.role === "user").length, 1);
  } finally {
    await h.cleanup();
  }
});

test("계정이 바뀌면 이전 대화를 표시하지 않는다", async () => {
  const h = await harness();
  try {
    await h.click("다대유는 어떤 사이트야?");
    await h.answer(answer);
    await h.switchUser("another-account");
    assert.doesNotMatch(h.text(), /복원할 실제 답변/);
  } finally {
    await h.cleanup();
  }
});

test("장소의 조건별 근거와 코스의 미확인 방문지를 표시하고 적용 조건을 조회에 전달한다", async () => {
  const h = await harness();
  try {
    await h.click("다대유는 어떤 사이트야?");
    await h.answer({
      ...answer,
      accessibilityNeeds: ["wheelchair", "accessible_toilet"],
      places: [
        {
          contentId: "100",
          title: "검증용 문화관",
          address: null,
          tel: null,
          category: null,
          activity: "전시 관람",
          tourDetails: [],
          accessibility: [],
          latitude: null,
          longitude: null,
          source: "TourAPI",
          informationUpdatedAt: "2026-09-20T00:00:00Z",
          accessibilityEvidence: [
            {
              need: "wheelchair",
              label: "휠체어 이동",
              status: "confirmed",
              evidence: "출입구에 경사로 있음"
            },
            { need: "accessible_toilet", label: "장애인 화장실", status: "unknown", evidence: null }
          ]
        }
      ],
      courses: [
        {
          course_id: 7,
          course_nm: "검증용 공개 코스",
          places: [{ title: "검증용 문화관", firstimage: null }],
          average_rating: 0,
          like_count: 0,
          place_count: 2,
          accessibilitySummary: {
            needs: ["wheelchair", "accessible_toilet"],
            totalPlaceCount: 2,
            confirmedPlaceCount: 0,
            unknownPlaceCount: 2,
            restrictedPlaceCount: 0,
            note: "장소 사이 이동 경로는 별도 확인이 필요합니다.",
            places: [
              {
                place_id: 1,
                title: "검증용 문화관",
                status: "unknown",
                matchedNeeds: ["wheelchair"],
                unknownNeeds: ["accessible_toilet"],
                restrictedNeeds: []
              },
              {
                place_id: null,
                title: "장소 정보 없음",
                status: "unknown",
                matchedNeeds: [],
                unknownNeeds: ["wheelchair", "accessible_toilet"],
                restrictedNeeds: []
              }
            ]
          }
        }
      ]
    });
    assert.match(h.text(), /출입구에 경사로 있음/);
    assert.match(h.text(), /해당 조건을 판단할 자료가 부족/);
    assert.match(h.text(), /전체 2곳 중 조건 확인 0곳/);
    assert.match(h.text(), /장소 정보 없음/);
    assert.match(h.text(), /현장 점검일은 아니/);
    const request = h.requests.find((entry) => entry.url.startsWith("/api/courses/shared"));
    assert.equal(
      new URL(request!.url, "http://localhost").searchParams.get("needs"),
      "wheelchair,accessible_toilet"
    );
    await h.click("채팅창 닫기");
    await h.render();
    assert.match(h.text(), /전체 2곳 중 조건 확인 0곳/);
  } finally {
    await h.cleanup();
  }
});

for (const outcome of ["success", "failure"] as const) {
  test(`요청 ${outcome} 후 늦게 준비된 질문 읽기는 답변이나 오류 안내를 방해하지 않는다`, async () => {
    let unlock: (value: boolean) => void = () => {};
    const h = await harness({
      unlock: () =>
        new Promise<boolean>((resolve) => {
          unlock = resolve;
        })
    });
    try {
      await h.click("다대유는 어떤 사이트야?");
      if (outcome === "success") {
        await h.answer(answer);
        assert.match(h.text(), /복원할 실제 답변/);
      } else {
        await h.fail();
        assert.match(h.text(), /같은 질문 다시 시도/);
      }
      const spoken = [...h.speakCalls];
      await act(async () => unlock(true));
      assert.deepEqual(h.speakCalls, spoken);
      if (outcome === "failure") {
        await h.click("같은 질문 다시 시도");
        await h.answer(answer);
        const saved = session.readChatSession(h.dom.window.sessionStorage, "guest")!;
        assert.equal(saved.messages.filter((message) => message.role === "user").length, 1);
      }
    } finally {
      await h.cleanup();
    }
  });
}

for (const action of ["manual", "automatic"] as const) {
  for (const transition of ["reset", "close", "owner"] as const) {
    test(`${action} 읽기 준비 중 ${transition} 전환하면 이전 대화를 재생하지 않는다`, async () => {
      let unlock: (value: boolean) => void = () => {};
      const h = await harness({
        unlock: () =>
          new Promise<boolean>((resolve) => {
            unlock = resolve;
          })
      });
      try {
        if (action === "automatic") {
          await h.click("답변 자동 읽기 끄기");
          await h.click("답변 자동 읽기 켜기");
        } else {
          await h.click("답변 음성 재생");
        }
        if (transition === "reset") await h.click("이전 대화를 지우고 새 대화 시작");
        if (transition === "close") await h.click("채팅창 닫기");
        if (transition === "owner") await h.switchUser("another-account");
        await act(async () => unlock(true));
        assert.deepEqual(h.speakCalls, []);
        if (action === "automatic" && transition === "reset") {
          assert.ok(h.dom.window.document.querySelector('[aria-label="답변 자동 읽기 켜기"]'));
        }
      } finally {
        await h.cleanup();
      }
    });
  }
}

test("텍스트 질문은 기존 음성 정리와 권한 준비 뒤 한 번 읽고 이어서 답변을 읽는다", async () => {
  const h = await harness();
  try {
    const question = "다대유는 어떤 사이트야?";
    await h.click(question);
    assert.deepEqual(h.speakCalls, [question]);
    const unlockIndex = h.ttsEvents.indexOf("unlock");
    assert.ok(unlockIndex > 0);
    assert.equal(h.ttsEvents[unlockIndex - 1], "stop");
    assert.ok(h.ttsEvents.indexOf("speak") > unlockIndex);
    await h.answer(answer);
    await h.render();
    assert.deepEqual(h.speakCalls, [question, answer.message]);
  } finally {
    await h.cleanup();
  }
});
