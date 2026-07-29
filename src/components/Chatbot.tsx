"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import {
  Accessibility,
  CheckCircle2,
  ClipboardCheck,
  Info,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X
} from "lucide-react";

type Confidence = "high" | "medium" | "low";

type ChatResponse = {
  message: string;
  card?: {
    title: string;
    rows: string[];
    source: string;
  };
  places?: PlaceRecommendation[];
  chips: string[];
  confidence: Confidence;
  sources: string[];
  debug?: {
    analysis: QueryAnalysis;
    inputMessage?: string;
    rag?: RagDebug;
    searchTerms: string[];
    weather?: WeatherDebug;
  };
};

type PlaceRecommendation = {
  title: string;
  category: string | null;
  address: string | null;
  tel: string | null;
  activity: string;
  tourDetails?: string[];
  accessibility: string[];
  latitude: string | null;
  longitude: string | null;
  source: string | null;
  tags: string[];
  followUps: string[];
};

type PlaceInfoTab = "tour" | "accessibility" | "check";

type WeatherDebug = {
  items: Array<{
    cityAreaId: string | null;
    cityName: string | null;
    doName: string | null;
    kmaTci: string | null;
    tciGrade: string | null;
    tm: string | null;
    totalCityName: string | null;
  }>;
  request?: {
    cityAreaId?: string | null;
    currentDate: string;
    day: string;
    endpoint: string;
  };
  source: string;
  status: "not_requested" | "not_configured" | "ready" | "empty" | "unavailable";
  statusMessage: string;
};

type RagDebug = {
  dbMatches: Array<{
    category: string | null;
    chunkIndex: number | null;
    contentPreview: string | null;
    rank: number;
    similarity: number | null;
    source: string | null;
    title: string | null;
  }>;
  embedding?: {
    dimensions?: number;
    input?: string;
    model?: string;
    status: "created" | "failed" | "not_configured" | "skipped";
    vectorPreview?: number[];
    vectorPreviewNote?: string;
  };
  searchMode: "vector" | "keyword" | "none";
  statusMessage: string;
  vectorCandidateCount?: number;
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

type ChatHistoryItem = {
  role: "assistant" | "user";
  content: string;
  placeTitles?: string[];
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  abort: () => void;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const INITIAL_RESPONSE: ChatResponse = {
  message: "어디로 가고 싶으세요? 필요한 조건까지 함께 찾아볼게요.",
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
const DAIYU_PROFILE_SRC = "/daiyu-profile.png";
const CHAT_SESSION_STORAGE_KEY = "daiyu-chat-session";
const MAX_STORED_MESSAGES = 30;
const MAX_HISTORY_ITEMS = 10;

interface Props {
  onClose: () => void;
  accessibilityNeeds?: string[];
}

export default function Chatbot({ onClose, accessibilityNeeds = [] }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", content: INITIAL_RESPONSE }
  ]);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoTtsEnabled, setIsAutoTtsEnabled] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [sttSupported, setSttSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [voiceInputStatus, setVoiceInputStatus] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const lastAutoSpokenMessageIdRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const conversationModeRef = useRef(false);
  const conversationRestartTimerRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);
  const voiceSessionIdRef = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    isAvailable: ttsSupported,
    speak: speakWithTts,
    stop: stopTts,
    unlock: unlockTts
  } = useTextToSpeech();

  function nextId() {
    nextIdRef.current += 1;
    return nextIdRef.current;
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setSttSupported(Boolean(getSpeechRecognitionConstructor()));
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      clearConversationRestartTimer();
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const storedMessages = getStoredChatMessages();
      setMessages(storedMessages);
      nextIdRef.current = getLatestMessageId(storedMessages);
      setIsSessionReady(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    conversationModeRef.current = isConversationMode;
  }, [isConversationMode]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (!isSessionReady) return;

    try {
      window.sessionStorage.setItem(
        CHAT_SESSION_STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
      );
    } catch {
      // The current conversation still works when session storage is unavailable.
    }
  }, [isSessionReady, messages]);

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

  const stopSpeech = useCallback(() => {
    stopTts();
    setSpeakingMessageId(null);
  }, [stopTts]);

  const stopVoiceInput = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const abortVoiceInput = useCallback(() => {
    voiceSessionIdRef.current += 1;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startSpeech = useCallback(
    (messageId: number, text: string, onDone?: () => void) => {
      if (!ttsSupported) return;

      const finish = () => {
        setSpeakingMessageId((current) => (current === messageId ? null : current));
        onDone?.();
      };

      setSpeakingMessageId(messageId);
      void speakWithTts({
        text,
        onEnd: finish,
        onError: () => {
          setVoiceInputStatus("답변 음성을 재생하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
          finish();
        }
      });
    },
    [speakWithTts, ttsSupported]
  );

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];

    if (
      !isAutoTtsEnabled ||
      !ttsSupported ||
      isLoading ||
      messages.length <= 1 ||
      latestMessage?.role !== "assistant" ||
      lastAutoSpokenMessageIdRef.current === latestMessage.id
    ) {
      return;
    }

    lastAutoSpokenMessageIdRef.current = latestMessage.id;
    startSpeech(latestMessage.id, latestMessage.content.message);
  }, [isAutoTtsEnabled, isLoading, messages, startSpeech, ttsSupported]);

  function speakMessage(messageId: number, text: string) {
    if (speakingMessageId === messageId) {
      stopSpeech();
      return;
    }

    startSpeech(messageId, text);
  }

  function toggleAutoTts() {
    if (!ttsSupported || isConversationMode) return;

    const nextValue = !isAutoTtsEnabled;
    setIsAutoTtsEnabled(nextValue);

    if (!nextValue) {
      stopSpeech();
      return;
    }

    const latestAssistantMessage = messages.findLast(
      (message): message is Extract<Message, { role: "assistant" }> => message.role === "assistant"
    );

    if (latestAssistantMessage) {
      lastAutoSpokenMessageIdRef.current = latestAssistantMessage.id;
      startSpeech(latestAssistantMessage.id, latestAssistantMessage.content.message);
    }
  }

  function startVoiceInput({ autoSubmit = false }: { autoSubmit?: boolean } = {}) {
    if (isLoadingRef.current) return;

    clearConversationRestartTimer();

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setVoiceInputStatus("이 브라우저는 음성 입력을 지원하지 않아요.");
      return;
    }

    stopSpeech();
    abortVoiceInput();

    const sessionId = voiceSessionIdRef.current + 1;
    voiceSessionIdRef.current = sessionId;
    const baseInput = !autoSubmit && input.trim() ? `${input.trimEnd()} ` : "";
    let latestTranscript = "";
    let finalTranscript = "";
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceInputStatus(
        autoSubmit
          ? "대화 모드로 듣는 중이에요. 질문을 말해주세요."
          : "듣는 중이에요. 말하면 입력창에 바로 들어갑니다."
      );
    };
    recognition.onresult = (event) => {
      let currentFinalTranscript = "";
      let interimTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || "";

        if (result.isFinal) {
          currentFinalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      latestTranscript = `${currentFinalTranscript}${interimTranscript}`.trim();
      if (currentFinalTranscript.trim()) {
        finalTranscript = currentFinalTranscript.trim();
      }
      setInput(`${baseInput}${latestTranscript}`.trimStart());
    };
    recognition.onerror = (event) => {
      if (voiceSessionIdRef.current !== sessionId) return;

      setIsListening(false);
      const message = getSpeechRecognitionErrorMessage(event.error);
      setVoiceInputStatus(message);

      if (
        autoSubmit &&
        conversationModeRef.current &&
        event.error !== "not-allowed" &&
        event.error !== "service-not-allowed" &&
        event.error !== "audio-capture"
      ) {
        scheduleConversationListening(1200);
      }
    };
    recognition.onend = () => {
      if (voiceSessionIdRef.current !== sessionId) return;

      recognitionRef.current = null;
      setIsListening(false);
      const voiceText = (finalTranscript || latestTranscript).trim();

      if (autoSubmit && conversationModeRef.current) {
        if (voiceText) {
          setVoiceInputStatus("질문을 보내는 중이에요.");
          void sendMessage(voiceText, { continueConversation: true });
          return;
        }

        setVoiceInputStatus("음성이 잘 들리지 않았어요. 다시 듣고 있어요.");
        scheduleConversationListening(900);
        return;
      }

      setVoiceInputStatus((current) => {
        if (current.startsWith("듣는 중")) return "음성 입력 완료. 확인 후 전송하세요.";
        return current;
      });
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceInputStatus("음성 입력을 시작하지 못했어요. 잠시 뒤 다시 눌러주세요.");
    }
  }

  function toggleVoiceInput() {
    if (isLoading) return;

    if (isListening) {
      stopVoiceInput();
      return;
    }

    startVoiceInput();
  }

  function toggleConversationMode() {
    if (!ttsSupported || !sttSupported) {
      setVoiceInputStatus("대화 모드는 음성 입력과 음성 읽어주기가 모두 준비되어야 쓸 수 있어요.");
      return;
    }

    const nextValue = !conversationModeRef.current;
    conversationModeRef.current = nextValue;
    setIsConversationMode(nextValue);

    if (!nextValue) {
      clearConversationRestartTimer();
      abortVoiceInput();
      stopSpeech();
      setVoiceInputStatus("대화 모드가 꺼졌어요.");
      return;
    }

    unlockTts();
    setIsAutoTtsEnabled(false);
    setInput("");
    setVoiceInputStatus("대화 모드가 켜졌어요. 질문을 말해주세요.");
    startVoiceInput({ autoSubmit: true });
  }

  function clearConversationRestartTimer() {
    if (conversationRestartTimerRef.current === null) return;

    window.clearTimeout(conversationRestartTimerRef.current);
    conversationRestartTimerRef.current = null;
  }

  function scheduleConversationListening(delay = 500) {
    clearConversationRestartTimer();

    if (!conversationModeRef.current) return;

    conversationRestartTimerRef.current = window.setTimeout(() => {
      conversationRestartTimerRef.current = null;
      if (!conversationModeRef.current || isLoadingRef.current) return;
      startVoiceInput({ autoSubmit: true });
    }, delay);
  }

  async function sendMessage(message: string, options: { continueConversation?: boolean } = {}) {
    const text = message.trim();
    if (!text || isLoadingRef.current) return;
    const history = buildChatHistory(messages);

    abortVoiceInput();
    stopSpeech();
    setMessages((current) => [...current, { id: nextId(), role: "user", text }]);
    setInput("");
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, accessibilityNeeds, history })
      });

      if (!response.ok) {
        throw new Error("chat request failed");
      }

      const data = (await response.json()) as ChatResponse;
      const assistantMessageId = nextId();
      setMessages((current) => [
        ...current,
        { id: assistantMessageId, role: "assistant", content: data }
      ]);

      if (options.continueConversation && conversationModeRef.current) {
        startSpeech(assistantMessageId, data.message, () => {
          if (conversationModeRef.current) {
            scheduleConversationListening();
          }
        });
      }
    } catch {
      const errorMessageId = nextId();
      const errorResponse: ChatResponse = {
        message: "응답을 만드는 중 문제가 생겼어요. 잠시 뒤 다시 질문해 주세요.",
        chips: ["한밭수목원 휠체어 가능해?", "성심당 갈 수 있어?"],
        confidence: "low",
        sources: []
      };
      setMessages((current) => [
        ...current,
        {
          id: errorMessageId,
          role: "assistant",
          content: errorResponse
        }
      ]);

      if (options.continueConversation && conversationModeRef.current) {
        startSpeech(errorMessageId, errorResponse.message, () => {
          if (conversationModeRef.current) {
            scheduleConversationListening(900);
          }
        });
      }
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function closeChat() {
    conversationModeRef.current = false;
    setIsConversationMode(false);
    clearConversationRestartTimer();
    abortVoiceInput();
    stopSpeech();
    onClose();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        closeChat();
      }}
      className="backdrop:bg-ink/45 shadow-navy-900/25 md:border-hairline fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-white p-0 shadow-2xl open:grid md:inset-y-4 md:right-4 md:left-auto md:h-auto md:w-[min(440px,calc(100vw-2rem))] md:rounded-lg md:border"
      aria-label="다유 챗봇"
    >
      <div className="border-hairline border-b bg-white">
        <header className="flex min-h-16 items-center justify-between gap-4 px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <DaiyuAvatar size="lg" variant="full" />
            <div className="min-w-0">
              <strong className="text-ink block text-base leading-tight font-semibold">다유</strong>
              <span className="text-steel mt-1 flex items-center gap-1.5 text-sm">
                <span className="bg-brand-500 h-2 w-2 rounded-full" aria-hidden="true" />
                {isConversationMode
                  ? isListening
                    ? "대화 모드로 듣는 중"
                    : "대화 모드 대기 중"
                  : isAutoTtsEnabled
                    ? "자동 읽기 켜짐"
                    : "질문을 기다리고 있어요"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeChat}
            className="text-slate hover:bg-surface grid h-12 w-12 shrink-0 place-items-center rounded-md"
            aria-label="채팅창 닫기"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        <details className="border-hairline border-t px-4 py-2">
          <summary className="text-slate flex min-h-12 cursor-pointer items-center gap-2 text-sm font-medium select-none">
            <Accessibility className="text-brand-700 h-4 w-4" aria-hidden="true" />
            음성 부가 설정
            <span className="text-steel ml-auto text-xs">
              대화 {isConversationMode ? "켜짐" : "꺼짐"} · 자동 읽기{" "}
              {isAutoTtsEnabled ? "켜짐" : "꺼짐"}
            </span>
          </summary>
          <div className="grid gap-2 pb-2 sm:grid-cols-2">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                disabled={(!ttsSupported || !sttSupported) && !isConversationMode}
                onClick={toggleConversationMode}
                aria-pressed={isConversationMode}
                className={`min-h-12 w-full rounded-md border px-3 text-left text-sm font-medium disabled:opacity-45 ${
                  isConversationMode
                    ? "border-gold-500 bg-gold-50 text-gold-900"
                    : "border-hairline text-slate bg-white"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    대화모드
                  </span>
                  <span>{isConversationMode ? "켜짐" : "꺼짐"}</span>
                </span>
              </button>
            </div>
            <button
              type="button"
              disabled={!ttsSupported || isConversationMode}
              onClick={toggleAutoTts}
              aria-pressed={isAutoTtsEnabled}
              aria-label={isAutoTtsEnabled ? "답변 자동 읽기 끄기" : "답변 자동 읽기 켜기"}
              className={`min-h-12 rounded-md border px-3 text-left text-sm font-medium disabled:opacity-45 ${
                isAutoTtsEnabled
                  ? "border-brand-600 bg-brand-50 text-brand-900"
                  : "border-hairline text-slate bg-white"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  {isAutoTtsEnabled ? (
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                  )}
                  자동 읽기
                </span>
                <span>{isAutoTtsEnabled ? "켜짐" : "꺼짐"}</span>
              </span>
            </button>
          </div>
        </details>
      </div>

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
              <div className="from-navy-600 to-brand-600 shadow-brand-900/10 max-w-[78%] rounded-2xl rounded-br-md bg-gradient-to-br px-4 py-3 text-[16px] leading-relaxed font-semibold text-white shadow-md">
                {message.text}
              </div>
            </div>
          ) : (
            <div key={message.id} ref={isLatest ? latestMessageRef : null}>
              <AssistantMessage
                messageId={message.id}
                response={message.content}
                disabled={isLoading || isConversationMode}
                isSpeaking={speakingMessageId === message.id}
                onChipClick={sendMessage}
                onSpeak={speakMessage}
                onStopSpeaking={stopSpeech}
                ttsSupported={ttsSupported}
              />
            </div>
          );
        })}
        {isLoading ? (
          <div className="flex items-end gap-2.5">
            <DaiyuAvatar />
            <div className="flex gap-1 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
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
          placeholder={
            isConversationMode
              ? isLoading
                ? "답변을 준비하는 중이에요..."
                : isListening
                  ? "대화 모드로 듣는 중이에요..."
                  : "대화 모드가 켜져 있어요"
              : isListening
                ? "듣는 중이에요..."
                : "메시지를 입력하세요..."
          }
          aria-label="질문 입력"
          disabled={isLoading || isConversationMode}
          className="focus:border-brand-400 min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[16px] transition-colors placeholder:text-gray-400 focus:bg-white disabled:opacity-60"
        />
        <button
          type="button"
          disabled={isLoading || (!sttSupported && !isConversationMode)}
          onClick={isConversationMode ? toggleConversationMode : toggleVoiceInput}
          aria-pressed={isConversationMode || isListening}
          aria-label={
            isConversationMode
              ? "대화 모드 끄기"
              : isListening
                ? "음성 입력 중지"
                : "음성으로 질문 입력"
          }
          title={
            isConversationMode
              ? "대화 모드 끄기"
              : sttSupported
                ? isListening
                  ? "음성 입력 중지"
                  : "음성으로 질문 입력"
                : "이 브라우저는 음성 입력을 지원하지 않아요"
          }
          className={`inline-flex h-12 min-w-[98px] shrink-0 items-center justify-center gap-1.5 rounded-2xl border px-3 text-[12px] font-extrabold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
            isConversationMode || isListening
              ? "border-red-300 bg-red-500 shadow-red-500/20 hover:bg-red-600"
              : "border-brand-200 bg-brand-500 shadow-brand-500/15 hover:bg-brand-600"
          }`}
        >
          {isConversationMode || isListening ? (
            <MicOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Mic className="h-5 w-5" aria-hidden="true" />
          )}
          <span>{isConversationMode ? "대화 종료" : isListening ? "듣기 중지" : "음성입력"}</span>
        </button>
        <button
          type="submit"
          disabled={isLoading || isConversationMode || !input.trim()}
          className="from-navy-600 to-brand-500 shadow-brand-500/20 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all hover:scale-105 disabled:scale-100 disabled:opacity-40"
          aria-label="전송"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="sr-only" aria-live="polite">
          {voiceInputStatus}
        </span>
      </form>
    </dialog>
  );
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function getStoredChatMessages(): Message[] {
  const initialMessages: Message[] = [{ id: 1, role: "assistant", content: INITIAL_RESPONSE }];
  if (typeof window === "undefined") return initialMessages;

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY) || "null");
    if (!Array.isArray(parsed)) return initialMessages;

    const storedMessages = parsed.filter(isStoredChatMessage).slice(-MAX_STORED_MESSAGES);
    return storedMessages.length ? storedMessages : initialMessages;
  } catch {
    return initialMessages;
  }
}

function isStoredChatMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "number") return false;
  if (record.role === "user") return typeof record.text === "string";
  if (record.role !== "assistant" || !record.content || typeof record.content !== "object") {
    return false;
  }

  const content = record.content as Record<string, unknown>;
  return (
    typeof content.message === "string" &&
    Array.isArray(content.chips) &&
    Array.isArray(content.sources) &&
    ["high", "medium", "low"].includes(String(content.confidence))
  );
}

function getLatestMessageId(messages: Message[]) {
  return messages.reduce((latestId, message) => Math.max(latestId, message.id), 1);
}

function buildChatHistory(messages: Message[]): ChatHistoryItem[] {
  return messages.slice(-MAX_HISTORY_ITEMS).map((message): ChatHistoryItem => {
    if (message.role === "user") {
      return { role: "user", content: message.text };
    }

    const placeTitles = message.content.places
      ?.map((place) => place.title.trim())
      .filter(Boolean)
      .slice(0, 5);

    return {
      role: "assistant",
      content: message.content.message,
      ...(placeTitles?.length ? { placeTitles } : {})
    };
  });
}

function getSpeechRecognitionErrorMessage(error?: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "마이크 권한이 필요해요. 브라우저 권한을 허용한 뒤 다시 눌러주세요.";
    case "no-speech":
      return "음성이 잘 들리지 않았어요. 마이크를 다시 눌러 말해 주세요.";
    case "audio-capture":
      return "마이크를 찾지 못했어요. 기기 입력 설정을 확인해 주세요.";
    case "network":
      return "음성 인식 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.";
    default:
      return "음성 입력을 다시 시도해 주세요.";
  }
}

function DaiyuAvatar({
  size = "md",
  variant = "profile",
  className = ""
}: {
  size?: "md" | "lg";
  variant?: "profile" | "full";
  className?: string;
}) {
  const sizeClass = size === "lg" ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-2xl";
  const imageSize = size === "lg" ? 56 : 44;
  const imageSrc = variant === "full" ? DAIYU_AVATAR_SRC : DAIYU_PROFILE_SRC;

  return (
    <span
      className={`${sizeClass} shadow-brand-500/20 ring-brand-100 shrink-0 overflow-hidden bg-white shadow-sm ring-1 ${className}`}
      aria-hidden="true"
    >
      <Image
        src={imageSrc}
        alt=""
        width={imageSize}
        height={imageSize}
        className="h-full w-full object-contain p-0.5"
        draggable={false}
      />
    </span>
  );
}

function PlaceRecommendationList({
  places,
  disabled,
  onChipClick
}: {
  places: PlaceRecommendation[];
  disabled: boolean;
  onChipClick: (message: string) => Promise<void>;
}) {
  const [selectedTabs, setSelectedTabs] = useState<Record<string, PlaceInfoTab>>({});

  return (
    <section className="mt-4 border-t border-gray-100 pt-4" aria-label="추천 후보">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <strong className="block text-[14px] font-extrabold text-gray-950">추천 후보</strong>
          <span className="mt-0.5 block text-[12px] font-semibold text-gray-500">
            관광정보와 접근성을 나눠서 확인해요
          </span>
        </div>
        <span className="bg-brand-50 text-brand-700 ring-brand-100 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1">
          {places.length}곳
        </span>
      </div>
      <div className="grid gap-3">
        {places.map((place, index) => {
          const placeKey = `${place.source || place.title}-${index}`;
          const activeTab = selectedTabs[placeKey] || getDefaultPlaceTab(place);

          return (
            <article
              key={placeKey}
              className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-brand-700 mb-1 block text-[11px] font-extrabold">
                    후보 {index + 1}
                    {place.category ? ` · ${place.category}` : ""}
                  </span>
                  <h4 className="text-[16px] leading-snug font-extrabold text-gray-950">
                    {place.title}
                  </h4>
                </div>
                {place.address || place.latitude ? (
                  <a
                    href={buildMapSearchUrl(place)}
                    target="_blank"
                    rel="noreferrer"
                    className="border-brand-200 text-brand-700 hover:bg-brand-50 inline-flex min-h-12 items-center gap-1.5 rounded-full border bg-white px-3 py-2 text-[12px] font-extrabold transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    위치 보기
                  </a>
                ) : null}
              </div>

              <div className="mt-3 grid gap-2 text-[13px] leading-relaxed text-gray-700">
                <p>
                  <strong className="font-extrabold text-gray-900">한눈에 보기</strong>{" "}
                  {place.activity}
                </p>
                {place.address || place.tel ? (
                  <div className="flex flex-wrap gap-1.5 text-[12px] font-bold text-gray-600">
                    {place.address ? (
                      <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-gray-100">
                        위치 {place.address}
                      </span>
                    ) : null}
                    {place.tel ? (
                      <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-gray-100">
                        문의 {place.tel}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div
                className="mt-3 grid grid-cols-3 gap-1.5"
                role="tablist"
                aria-label={`${place.title} 정보 보기`}
              >
                {(["tour", "accessibility", "check"] as PlaceInfoTab[]).map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      type="button"
                      key={tab}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() =>
                        setSelectedTabs((current) => ({
                          ...current,
                          [placeKey]: tab
                        }))
                      }
                      className={`inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[12px] font-extrabold transition-colors ${
                        isActive
                          ? "bg-brand-600 text-white shadow-sm"
                          : "hover:bg-brand-50 hover:text-brand-700 bg-white text-gray-600 ring-1 ring-gray-100"
                      }`}
                    >
                      {tab === "tour" ? <Info className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                      {tab === "accessibility" ? (
                        <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : null}
                      {tab === "check" ? (
                        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : null}
                      {getPlaceTabLabel(tab)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 border-t border-gray-200 pt-3">
                <PlaceTabContent place={place} tab={activeTab} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {place.followUps.slice(0, 2).map((question) => (
                  <button
                    type="button"
                    key={question}
                    disabled={disabled}
                    onClick={() => void onChipClick(question)}
                    className="border-brand-200 text-brand-700 hover:border-brand-400 hover:bg-brand-50 min-h-12 rounded-full border bg-white px-3 py-2 text-left text-[12px] leading-snug font-extrabold transition-colors disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>

              {place.source ? (
                <span className="mt-2 block truncate text-[11px] font-semibold text-gray-400">
                  출처: {place.source}
                </span>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PlaceTabContent({ place, tab }: { place: PlaceRecommendation; tab: PlaceInfoTab }) {
  if (tab === "tour") {
    const details = place.tourDetails || [];
    return (
      <div className="text-[13px] leading-relaxed text-gray-700">
        <strong className="block text-[12px] font-extrabold text-gray-950">관광정보</strong>
        {details.length ? (
          <ul className="mt-2 grid gap-1.5">
            {details.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-gray-500">
            상세 운영정보는 아직 부족하지만, 위의 한눈에 보기 내용을 기준으로 방문 목적을 잡아볼 수
            있어요.
          </p>
        )}
      </div>
    );
  }

  if (tab === "accessibility") {
    return (
      <div className="text-[13px] leading-relaxed text-gray-700">
        <strong className="block text-[12px] font-extrabold text-gray-950">접근성</strong>
        {place.accessibility.length ? (
          <ul className="mt-2 grid gap-1.5">
            {place.accessibility.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="bg-brand-400 mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-gray-500">
            접근성 세부 항목은 아직 부족해요. 방문 전 공식 안내처로 한 번 더 확인하는 게 좋아요.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="text-[13px] leading-relaxed text-gray-700">
      <strong className="block text-[12px] font-extrabold text-gray-950">방문 전 확인</strong>
      <ul className="mt-2 grid gap-1.5">
        {getPlaceCheckItems(place).map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getDefaultPlaceTab(place: PlaceRecommendation): PlaceInfoTab {
  if (place.tourDetails?.length) return "tour";
  if (place.accessibility.length) return "accessibility";
  return "check";
}

function getPlaceTabLabel(tab: PlaceInfoTab) {
  if (tab === "tour") return "관광";
  if (tab === "accessibility") return "접근성";
  return "확인";
}

function getPlaceCheckItems(place: PlaceRecommendation) {
  return [
    "운영시간, 휴무일, 편의시설은 현장에서 바뀔 수 있어요.",
    place.tel ? `방문 전 문의: ${place.tel}` : "방문 전 공식 홈페이지나 안내처 확인을 권장해요.",
    "주차장, 출입구, 화장실 위치는 도착 전 지도와 현장 안내를 같이 확인해 주세요."
  ];
}

function buildMapSearchUrl(place: PlaceRecommendation) {
  if (place.latitude && place.longitude) {
    return `https://map.naver.com/p/search/${encodeURIComponent(
      `${place.latitude},${place.longitude}`
    )}`;
  }

  return `https://map.naver.com/p/search/${encodeURIComponent(place.address || place.title)}`;
}

function AssistantMessage({
  messageId,
  response,
  disabled,
  isSpeaking,
  onChipClick,
  onSpeak,
  onStopSpeaking,
  ttsSupported
}: {
  messageId: number;
  response: ChatResponse;
  disabled: boolean;
  isSpeaking: boolean;
  onChipClick: (message: string) => Promise<void>;
  onSpeak: (messageId: number, text: string) => void;
  onStopSpeaking: () => void;
  ttsSupported: boolean;
}) {
  const showEvidenceBadge = Boolean(response.card || response.debug);
  const showTechnicalDetails = response.sources.length > 0;
  const showDebugDetails = false;

  return (
    <div className="flex items-start gap-3">
      <DaiyuAvatar className="mt-1" />
      <div className="min-w-0 flex-1 rounded-[1.4rem] rounded-bl-md border border-gray-200 bg-white px-4 py-4 text-sm leading-relaxed text-gray-800 shadow-sm shadow-gray-200/60 sm:px-5 sm:py-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {showEvidenceBadge ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-extrabold ${confidenceTone[response.confidence]}`}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {confidenceLabels[response.confidence]}
            </span>
          ) : null}
          <button
            type="button"
            disabled={!ttsSupported}
            onClick={() => {
              if (isSpeaking) {
                onStopSpeaking();
                return;
              }
              onSpeak(messageId, response.message);
            }}
            className="border-brand-200 text-brand-700 hover:border-brand-400 hover:bg-brand-50 ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-full border bg-white px-2.5 py-1.5 text-[12px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
            aria-label={isSpeaking ? "답변 읽기 중지" : "답변 읽어주기"}
          >
            {isSpeaking ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isSpeaking ? "중지" : "읽기"}
          </button>
        </div>
        <p className="text-[15px] leading-7 font-semibold whitespace-pre-line text-gray-950 sm:text-[16px] sm:leading-7">
          {response.message}
        </p>
        {!ttsSupported ? (
          <span className="mt-2 block text-[12px] font-semibold text-gray-400">
            현재 음성 읽어주기를 사용할 수 없어요.
          </span>
        ) : null}

        {response.places?.length ? (
          <PlaceRecommendationList
            places={response.places}
            disabled={disabled}
            onChipClick={onChipClick}
          />
        ) : null}

        {response.card ? (
          <details className="border-brand-100 bg-brand-50/70 mt-4 rounded-2xl border px-3.5 py-3 text-gray-700">
            <summary className="text-brand-800 flex cursor-pointer items-center gap-2 text-[13px] font-extrabold select-none">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {response.card.title}
              <span className="text-brand-600 ml-auto text-[11px] font-bold">근거 보기</span>
            </summary>
            <ul className="mt-3 grid gap-2 text-[13px] leading-relaxed text-gray-700">
              {response.card.rows.map((row) => (
                <li key={row} className="flex gap-2">
                  <span className="bg-brand-500 mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span>{row}</span>
                </li>
              ))}
            </ul>
            <span className="border-brand-200 mt-3 block border-t border-dashed pt-2.5 text-[12px] leading-relaxed text-gray-500">
              {response.card.source}
            </span>
          </details>
        ) : null}

        {showTechnicalDetails ? (
          <details className="border-navy-100 bg-navy-50/50 mt-3 rounded-2xl border px-3 py-2.5 text-xs text-gray-800">
            <summary className="text-navy-700 cursor-pointer text-xs font-extrabold select-none">
              정보 출처
            </summary>
            {showDebugDetails && response.debug ? (
              <>
                <strong className="text-navy-700 mt-3 block text-[11px] font-extrabold">
                  질문분류 JSON
                </strong>
                <pre className="ring-navy-100 mt-2 max-h-48 overflow-auto rounded-xl bg-white p-3 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-gray-800 ring-1">
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
                {response.debug.inputMessage ? (
                  <div className="ring-navy-100 mt-3 rounded-xl bg-white p-3 text-[12px] leading-relaxed text-gray-800 ring-1">
                    <strong className="text-navy-700 mb-1 block text-[11px] font-extrabold">
                      입력 질문
                    </strong>
                    {response.debug.inputMessage}
                  </div>
                ) : null}
                {response.debug.rag ? (
                  <div className="border-navy-100 mt-3 rounded-2xl border bg-white/70 p-3">
                    <strong className="text-navy-700 block text-[11px] font-extrabold">
                      RAG 디버그
                    </strong>
                    <div className="mt-2 grid gap-2 text-[12px] leading-relaxed text-gray-700">
                      <div className="ring-navy-100 rounded-xl bg-white p-3 ring-1">
                        <span className="block font-extrabold text-gray-900">1. 검색 상태</span>
                        <span className="mt-1 block">방식: {response.debug.rag.searchMode}</span>
                        <span className="block">상태: {response.debug.rag.statusMessage}</span>
                        {typeof response.debug.rag.vectorCandidateCount === "number" ? (
                          <span className="block">
                            pgvector 후보: {response.debug.rag.vectorCandidateCount}개
                          </span>
                        ) : null}
                      </div>

                      {response.debug.rag.embedding ? (
                        <div className="ring-navy-100 rounded-xl bg-white p-3 ring-1">
                          <span className="block font-extrabold text-gray-900">
                            2. 질문 embedding
                          </span>
                          <div className="mt-1 grid gap-1">
                            <span>상태: {response.debug.rag.embedding.status}</span>
                            {response.debug.rag.embedding.model ? (
                              <span>모델: {response.debug.rag.embedding.model}</span>
                            ) : null}
                            {response.debug.rag.embedding.dimensions ? (
                              <span>차원: {response.debug.rag.embedding.dimensions}</span>
                            ) : null}
                          </div>
                          {response.debug.rag.embedding.input ? (
                            <>
                              <span className="mt-3 block font-extrabold text-gray-900">
                                embedding 입력
                              </span>
                              <pre className="bg-navy-50/70 mt-1 max-h-36 overflow-auto rounded-lg p-2 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-gray-800">
                                {response.debug.rag.embedding.input}
                              </pre>
                            </>
                          ) : null}
                          {response.debug.rag.embedding.vectorPreview?.length ? (
                            <>
                              <span className="mt-3 block font-extrabold text-gray-900">
                                embedding 벡터 샘플
                              </span>
                              <pre className="bg-navy-50/70 mt-1 max-h-28 overflow-auto rounded-lg p-2 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-gray-800">
                                {JSON.stringify(response.debug.rag.embedding.vectorPreview)}
                              </pre>
                              {response.debug.rag.embedding.vectorPreviewNote ? (
                                <span className="mt-1 block text-[11px] text-gray-500">
                                  {response.debug.rag.embedding.vectorPreviewNote}
                                </span>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="ring-navy-100 rounded-xl bg-white p-3 ring-1">
                        <span className="block font-extrabold text-gray-900">3. DB 매칭 결과</span>
                        {response.debug.rag.dbMatches.length > 0 ? (
                          <ol className="mt-2 grid gap-2">
                            {response.debug.rag.dbMatches.map((match) => (
                              <li
                                key={`${match.rank}-${match.source || match.title || "match"}`}
                                className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2"
                              >
                                <div className="flex flex-wrap items-center gap-1.5 font-bold text-gray-900">
                                  <span>{match.rank}.</span>
                                  <span>{match.title || "제목 없음"}</span>
                                  {typeof match.similarity === "number" ? (
                                    <span className="bg-brand-50 text-brand-700 ring-brand-100 rounded-full px-2 py-0.5 text-[11px] ring-1">
                                      유사도 {match.similarity.toFixed(4)}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-[11px] text-gray-500">
                                  {match.category || "분류 없음"}
                                  {match.chunkIndex !== null ? ` · chunk ${match.chunkIndex}` : ""}
                                  {match.source ? ` · ${match.source}` : ""}
                                </div>
                                {match.contentPreview ? (
                                  <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-gray-700">
                                    {match.contentPreview}
                                  </p>
                                ) : null}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <span className="mt-1 block text-gray-500">매칭된 DB 근거 없음</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
                {response.debug.weather ? (
                  <div className="border-navy-100 mt-3 rounded-2xl border bg-white/70 p-3">
                    <strong className="text-navy-700 block text-[11px] font-extrabold">
                      날씨 디버그
                    </strong>
                    <div className="ring-navy-100 mt-2 rounded-xl bg-white p-3 text-[12px] leading-relaxed text-gray-700 ring-1">
                      <span className="block font-extrabold text-gray-900">조회 상태</span>
                      <span className="mt-1 block">상태: {response.debug.weather.status}</span>
                      <span className="block">메시지: {response.debug.weather.statusMessage}</span>
                      {response.debug.weather.request ? (
                        <>
                          <span className="mt-3 block font-extrabold text-gray-900">요청 조건</span>
                          <span className="block">
                            기준시각: {response.debug.weather.request.currentDate}
                          </span>
                          <span className="block">
                            예보기간: {response.debug.weather.request.day}일
                          </span>
                          {response.debug.weather.request.cityAreaId ? (
                            <span className="block">
                              CITY_AREA_ID: {response.debug.weather.request.cityAreaId}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    <div className="ring-navy-100 mt-2 rounded-xl bg-white p-3 text-[12px] leading-relaxed text-gray-700 ring-1">
                      <span className="block font-extrabold text-gray-900">관광기후지수 매칭</span>
                      {response.debug.weather.items.length > 0 ? (
                        <ol className="mt-2 grid gap-2">
                          {response.debug.weather.items.map((item, index) => (
                            <li
                              key={`${item.cityAreaId || item.cityName || "weather"}-${index}`}
                              className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2"
                            >
                              <div className="font-bold text-gray-900">
                                {item.totalCityName ||
                                  [item.doName, item.cityName].filter(Boolean).join(" ") ||
                                  "지역명 없음"}
                              </div>
                              <div className="mt-1 text-[11px] text-gray-500">
                                {item.tciGrade ? `등급 ${item.tciGrade}` : "등급 없음"}
                                {item.kmaTci ? ` · 지수 ${item.kmaTci}` : ""}
                                {item.tm ? ` · ${item.tm}` : ""}
                              </div>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="mt-1 block text-gray-500">매칭된 관광기후지수 없음</span>
                      )}
                      <span className="mt-2 block text-[11px] text-gray-500">
                        {response.debug.weather.source}
                      </span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            {response.sources.length > 0 ? (
              <div className="border-navy-100 mt-3 border-t pt-3">
                <strong className="text-navy-700 block text-[11px] font-extrabold">
                  답변에 사용한 정보
                </strong>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {response.sources.map((source) => (
                    <span
                      key={source}
                      className="text-navy-600 ring-navy-100 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold ring-1"
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
                  className="border-brand-200 text-brand-700 hover:border-brand-400 hover:bg-brand-50 rounded-full border bg-white px-3 py-2 text-left text-[13px] leading-snug font-bold transition-colors disabled:opacity-50"
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
