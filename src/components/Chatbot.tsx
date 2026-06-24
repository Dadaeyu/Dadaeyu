"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, MapPin, Send, Sparkles, X } from "lucide-react";

type Confidence = "high" | "medium" | "low";

type ChatResponse = {
  message: string;
  card?: {
    title: string;
    rows: string[];
    source: string;
  };
  chips: string[];
  confidence: Confidence;
  sources: string[];
  debug?: {
    analysis: QueryAnalysis;
    searchTerms: string[];
  };
};

type QueryAnalysis = {
  in_scope: boolean;
  scope_reason: string;
  intent: "recommend_place" | "check_accessibility" | "ask_info";
  accessibility_needs: string[];
  weather_sensitive: boolean;
  place_name: string | null;
  location: string | null;
  keywords: string[];
};

type Message =
  | {
      id: number;
      role: "assistant";
      content: ChatResponse;
    }
  | {
      id: number;
      role: "user";
      text: string;
    };

const INITIAL_RESPONSE: ChatResponse = {
  message:
    "안녕하세요! 대전 무장애 여행 도우미 다유예요. 궁금한 여행지나 코스를 알려주시면 방문 전 확인할 접근성 정보를 정리해드릴게요.",
  chips: [
    "한밭수목원 휠체어 가능해?",
    "성심당 휠체어로 갈 수 있어?",
    "아기랑 같이 갈만한 곳 추천해줘"
  ],
  confidence: "high",
  sources: ["MVP 시나리오"]
};

const confidenceLabels: Record<Confidence, string> = {
  high: "근거 충분",
  medium: "부분 확인",
  low: "확인 필요"
};

const confidenceTone: Record<Confidence, string> = {
  high: "border-brand-200 bg-brand-50 text-brand-700",
  medium: "border-gold-200 bg-gold-50 text-gold-700",
  low: "border-red-200 bg-red-50 text-red-700"
};

interface Props {
  onClose: () => void;
}

export default function Chatbot({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", content: INITIAL_RESPONSE }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(1);

  function nextId() {
    nextIdRef.current += 1;
    return nextIdRef.current;
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage(message: string) {
    const text = message.trim();
    if (!text || isLoading) return;

    setMessages((current) => [...current, { id: nextId(), role: "user", text }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      if (!response.ok) {
        throw new Error("chat request failed");
      }

      const data = (await response.json()) as ChatResponse;
      setMessages((current) => [...current, { id: nextId(), role: "assistant", content: data }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: nextId(),
          role: "assistant",
          content: {
            message: "응답을 만드는 중 문제가 생겼어요. 잠시 뒤 다시 질문해 주세요.",
            chips: ["한밭수목원 휠체어 가능해?", "성심당 갈 수 있어?"],
            confidence: "low",
            sources: []
          }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <section
      className="fixed inset-x-3 top-20 bottom-20 z-[70] grid grid-rows-[96px_minmax(0,1fr)_78px] overflow-hidden rounded-lg border border-white/60 bg-white shadow-2xl sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-24 sm:h-[min(720px,calc(100dvh-7.5rem))] sm:min-h-[560px] sm:w-[min(calc(100vw-2.5rem),460px)]"
      aria-label="다유 챗봇"
    >
      <header className="from-hero-sky-from to-hero-sky-to text-ink relative overflow-hidden bg-gradient-to-b px-5 py-4">
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/40 blur-2xl" />
        <div className="bg-mint-soft/30 pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/60 ring-1 ring-white/70">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-ink mb-1 inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-bold ring-1 ring-white/70">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                다유
              </span>
              <strong className="block text-base leading-tight font-extrabold">
                무장애 여행 상담
              </strong>
              <span className="text-slate mt-1 flex items-center gap-1.5 text-xs">
                <span className="bg-mint-deep h-1.5 w-1.5 rounded-full" />
                대전 접근성 정보 확인 중
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate hover:text-ink grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/60"
            aria-label="채팅창 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        className="from-brand-50/50 via-surface-soft min-h-0 space-y-4 overflow-y-auto bg-gradient-to-b to-white px-4 py-4 sm:px-5"
        aria-live="polite"
      >
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="bg-mint-soft/40 text-ink max-w-[82%] rounded-lg rounded-br-md px-4 py-3 text-sm leading-relaxed font-medium">
                {message.text}
              </div>
            </div>
          ) : (
            <AssistantMessage
              key={message.id}
              response={message.content}
              disabled={isLoading}
              onChipClick={sendMessage}
            />
          )
        )}
        {isLoading ? (
          <div className="flex items-end gap-2.5">
            <div className="bg-mint-soft text-ink grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold">
              다
            </div>
            <div className="border-hairline flex gap-1 rounded-lg rounded-bl-md border bg-white px-4 py-3">
              <span className="bg-brand-500 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.2s]" />
              <span className="bg-brand-500 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.1s]" />
              <span className="bg-brand-500 h-2 w-2 animate-bounce rounded-full" />
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="border-hairline flex items-center gap-2.5 border-t bg-white/95 px-4 py-3 backdrop-blur sm:px-5"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="메시지를 입력하세요..."
          aria-label="질문 입력"
          disabled={isLoading}
          className="border-hairline bg-surface-soft placeholder:text-stone focus:border-brand-400 min-w-0 flex-1 rounded-lg border px-4 py-3 text-sm transition-colors outline-none focus:bg-white disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-mint text-ink hover:bg-mint-deep grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-lg transition-all hover:scale-105 disabled:scale-100 disabled:opacity-40"
          aria-label="전송"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

function AssistantMessage({
  response,
  disabled,
  onChipClick
}: {
  response: ChatResponse;
  disabled: boolean;
  onChipClick: (message: string) => Promise<void>;
}) {
  return (
    <div className="flex items-end gap-2.5">
      <div className="bg-mint-soft text-ink grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold">
        다
      </div>
      <div className="border-hairline text-ink max-w-[calc(100%-3rem)] rounded-lg rounded-bl-md border bg-white px-4 py-3 text-sm leading-relaxed">
        <span
          className={`mb-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${confidenceTone[response.confidence]}`}
        >
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          {confidenceLabels[response.confidence]}
        </span>
        <p className="text-ink text-[15px] leading-7 whitespace-pre-line">{response.message}</p>

        {response.debug ? (
          <div className="border-navy-100 bg-navy-50/70 text-ink mt-4 rounded-lg border p-3 text-xs">
            <strong className="text-navy-700 block text-xs font-extrabold">질문분류 JSON</strong>
            <pre className="text-ink ring-navy-100 mt-3 max-h-60 overflow-auto rounded-lg bg-white p-3 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap ring-1">
              {JSON.stringify(response.debug.analysis, null, 2)}
            </pre>
            {response.debug.searchTerms.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {response.debug.searchTerms.map((term) => (
                  <span
                    key={term}
                    className="text-navy-600 ring-navy-100 rounded-full bg-white px-2 py-1 text-[11px] font-semibold ring-1"
                  >
                    {term}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {response.card ? (
          <div className="border-brand-100 from-brand-50 mt-4 rounded-lg border bg-gradient-to-br to-white p-4">
            <strong className="text-brand-800 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {response.card.title}
            </strong>
            <ul className="text-slate mt-3 list-disc space-y-1.5 pl-4">
              {response.card.rows.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
            <span className="border-brand-200 text-steel mt-3 block border-t border-dashed pt-3 text-xs leading-relaxed">
              {response.card.source}
            </span>
          </div>
        ) : null}

        {response.sources.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {response.sources.map((source) => (
              <span
                key={source}
                className="bg-navy-50 text-navy-600 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              >
                {source}
              </span>
            ))}
          </div>
        ) : null}

        {response.chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {response.chips.map((chip) => (
              <button
                type="button"
                key={chip}
                disabled={disabled}
                onClick={() => void onChipClick(chip)}
                className="border-brand-200 text-brand-700 hover:border-brand-400 hover:bg-brand-50 rounded-full border bg-white px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
