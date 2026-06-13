"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, MapPin, Send, Sparkles, X } from "lucide-react";

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
    "안녕하세요, 다유예요. 다대유가 어떤 서비스인지 궁금해도 좋고, 대전 여행지 접근성을 바로 물어봐도 괜찮아요. 방문 전에 확인할 내용을 차근차근 정리해드릴게요.",
  chips: [
    "다대유는 어떤 사이트야?",
    "어떻게 질문하면 돼?",
    "대전어린이회관 휠체어 가능해?",
    "유모차로 갈만한 문화시설"
  ],
  confidence: "high",
  sources: []
};

const confidenceLabels: Record<Confidence, string> = {
  high: "확인됨",
  medium: "근거 기반",
  low: "근거 부족"
};

const confidenceTone: Record<Confidence, string> = {
  high: "border-brand-200 bg-brand-50 text-brand-700",
  medium: "border-gold-200 bg-gold-50 text-gold-700",
  low: "border-red-200 bg-red-50 text-red-700"
};

const DAIYU_AVATAR_SRC = "/daiyu-avatar.png";

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
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(1);

  function nextId() {
    nextIdRef.current += 1;
    return nextIdRef.current;
  }

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.role === "assistant" && messages.length > 1 && !isLoading) {
      latestMessageRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth"
      });
      return;
    }

    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage(message: string) {
    const text = message.trim();
    if (!text || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: nextId(), role: "user", text }
    ]);
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
      setMessages((current) => [
        ...current,
        { id: nextId(), role: "assistant", content: data }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: nextId(),
          role: "assistant",
          content: {
            message:
              "응답을 만드는 중 문제가 생겼어요. 잠시 뒤 다시 질문해 주세요.",
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
      className="fixed inset-x-2 bottom-4 top-4 z-[70] grid grid-rows-[82px_minmax(0,1fr)_84px] overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-navy-900/25 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-6 sm:w-[min(calc(100vw-3rem),720px)]"
      aria-label="다유 챗봇"
    >
      <header className="relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-600 to-brand-600 px-5 py-4 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-300/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-gold-300/20 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <DaiyuAvatar size="lg" className="ring-white/30" />
          <div className="min-w-0">
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white/90 ring-1 ring-white/15">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              다유
            </span>
            <strong className="block text-base font-extrabold leading-tight">
              무장애 여행 상담
            </strong>
            <span className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-200" />
              대전 접근성 정보 확인 중
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/85 transition-colors hover:bg-white/15 hover:text-white"
          aria-label="채팅창 닫기"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        </div>
      </header>

      <div
        className="min-h-0 space-y-4 overflow-y-auto bg-[#f6faf8] px-4 py-5 sm:px-6 lg:px-7"
        aria-live="polite"
      >
        {messages.map((message, index) => {
          const isLatest = index === messages.length - 1;
          return message.role === "user" ? (
            <div
              key={message.id}
              ref={isLatest ? latestMessageRef : null}
              className="flex justify-end"
            >
              <div className="max-w-[78%] rounded-2xl rounded-br-md bg-gradient-to-br from-navy-600 to-brand-600 px-4 py-3 text-[16px] font-semibold leading-relaxed text-white shadow-md shadow-brand-900/10">
                {message.text}
              </div>
            </div>
          ) : (
            <div key={message.id} ref={isLatest ? latestMessageRef : null}>
              <AssistantMessage
                response={message.content}
                disabled={isLoading}
                onChipClick={sendMessage}
              />
            </div>
          );
        })}
        {isLoading ? (
          <div className="flex items-end gap-2.5">
            <DaiyuAvatar />
            <div className="flex gap-1 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500" />
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2.5 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="메시지를 입력하세요..."
          aria-label="질문 입력"
          disabled={isLoading}
          className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[16px] outline-none transition-colors placeholder:text-gray-400 focus:border-brand-400 focus:bg-white disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-navy-600 to-brand-500 text-white shadow-lg shadow-brand-500/20 transition-all hover:scale-105 disabled:scale-100 disabled:opacity-40"
          aria-label="전송"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

function DaiyuAvatar({
  size = "md",
  className = ""
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const sizeClass = size === "lg" ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-2xl";
  const imageSize = size === "lg" ? 56 : 44;

  return (
    <span
      className={`${sizeClass} shrink-0 overflow-hidden bg-white shadow-sm shadow-brand-500/20 ring-1 ring-brand-100 ${className}`}
      aria-hidden="true"
    >
      <Image
        src={DAIYU_AVATAR_SRC}
        alt=""
        width={imageSize}
        height={imageSize}
        className="h-full w-full object-contain p-0.5"
        draggable={false}
      />
    </span>
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
  const showEvidenceBadge = Boolean(response.card || response.debug);
  const showTechnicalDetails = Boolean(response.debug || response.sources.length);

  return (
    <div className="flex items-start gap-3">
      <DaiyuAvatar className="mt-1" />
      <div className="min-w-0 flex-1 rounded-[1.4rem] rounded-bl-md border border-gray-200 bg-white px-4 py-4 text-sm leading-relaxed text-gray-800 shadow-sm shadow-gray-200/60 sm:px-5 sm:py-5">
        {showEvidenceBadge ? (
          <span
            className={`mb-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-extrabold ${confidenceTone[response.confidence]}`}
          >
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {confidenceLabels[response.confidence]}
          </span>
        ) : null}
        <p className="whitespace-pre-line text-[17px] font-semibold leading-8 text-gray-950 sm:text-[18px] sm:leading-9">
          {response.message}
        </p>

        {response.card ? (
          <details className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/70 px-3.5 py-3 text-gray-700">
            <summary className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-extrabold text-brand-800">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {response.card.title}
              <span className="ml-auto text-[11px] font-bold text-brand-600">
                근거 보기
              </span>
            </summary>
            <ul className="mt-3 grid gap-2 text-[13px] leading-relaxed text-gray-700">
              {response.card.rows.map((row) => (
                <li key={row} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  <span>{row}</span>
                </li>
              ))}
            </ul>
            <span className="mt-3 block border-t border-dashed border-brand-200 pt-2.5 text-[12px] leading-relaxed text-gray-500">
              {response.card.source}
            </span>
          </details>
        ) : null}

        {showTechnicalDetails ? (
          <details className="mt-3 rounded-2xl border border-navy-100 bg-navy-50/50 px-3 py-2.5 text-xs text-gray-800">
            <summary className="cursor-pointer select-none text-xs font-extrabold text-navy-700">
              개발자 정보
            </summary>
            {response.debug ? (
              <>
                <strong className="mt-3 block text-[11px] font-extrabold text-navy-700">
                  질문분류 JSON
                </strong>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-3 font-mono text-[11px] leading-relaxed text-gray-800 ring-1 ring-navy-100">
                  {JSON.stringify(response.debug.analysis, null, 2)}
                </pre>
                {response.debug.searchTerms.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {response.debug.searchTerms.map((term) => (
                      <span
                        key={term}
                        className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-navy-600 ring-1 ring-navy-100"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
            {response.sources.length > 0 ? (
              <div className="mt-3 border-t border-navy-100 pt-3">
                <strong className="block text-[11px] font-extrabold text-navy-700">
                  내부 출처
                </strong>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {response.sources.map((source) => (
                    <span
                      key={source}
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-navy-600 ring-1 ring-navy-100"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </details>
        ) : null}

        {response.chips.length > 0 ? (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <span className="mb-2 block text-[12px] font-extrabold text-gray-500">
              이어서 물어보기
            </span>
            <div className="flex flex-wrap gap-2">
              {response.chips.map((chip) => (
                <button
                  type="button"
                  key={chip}
                  disabled={disabled}
                  onClick={() => void onChipClick(chip)}
                  className="rounded-full border border-brand-200 bg-white px-3 py-2 text-left text-[13px] font-bold leading-snug text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
