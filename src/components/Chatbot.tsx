"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  MapPin,
  Mic,
  MicOff,
  Send,
  Sparkles,
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
const TTS_VOICE_STORAGE_KEY = "daiyu-tts-voice-uri";

interface Props {
  onClose: () => void;
}

export default function Chatbot({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", content: INITIAL_RESPONSE }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoTtsEnabled, setIsAutoTtsEnabled] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => getStoredTtsVoiceURI());
  const [sttSupported, setSttSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceInputStatus, setVoiceInputStatus] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const lastAutoSpokenMessageIdRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function nextId() {
    nextIdRef.current += 1;
    return nextIdRef.current;
  }

  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return undefined;

    const loadVoices = () => {
      setTtsSupported(true);
      setTtsVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setSttSupported(Boolean(getSpeechRecognitionConstructor()));
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      recognitionRef.current?.abort();
    };
  }, []);

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

  const allowedTtsVoices = ttsVoices.filter((voice) => isAllowedTtsVoice(voice));
  const selectedKoreanVoice = getSelectedKoreanVoice(ttsVoices, selectedVoiceURI);
  const displayedVoiceURI = selectedKoreanVoice?.voiceURI || "";

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  }, []);

  const stopVoiceInput = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const abortVoiceInput = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startSpeech = useCallback(
    (messageId: number, text: string) => {
      if (!isSpeechSynthesisSupported()) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = 0.9;
      utterance.pitch = 1.02;
      utterance.voice = selectedKoreanVoice;
      utterance.onend = () => {
        setSpeakingMessageId((current) => (current === messageId ? null : current));
      };
      utterance.onerror = () => {
        setSpeakingMessageId((current) => (current === messageId ? null : current));
      };

      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    },
    [selectedKoreanVoice]
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
    if (!ttsSupported) return;

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

  function toggleVoiceInput() {
    if (isLoading) return;

    if (isListening) {
      stopVoiceInput();
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setVoiceInputStatus("이 브라우저는 음성 입력을 지원하지 않아요.");
      return;
    }

    stopSpeech();
    abortVoiceInput();

    const baseInput = input.trim() ? `${input.trimEnd()} ` : "";
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceInputStatus("듣는 중이에요. 말하면 입력창에 바로 들어갑니다.");
    };
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || "";

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setInput(`${baseInput}${finalTranscript}${interimTranscript}`.trimStart());
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceInputStatus(getSpeechRecognitionErrorMessage(event.error));
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceInputStatus((current) =>
        current.startsWith("듣는 중") ? "음성 입력 완료. 확인 후 전송하세요." : current
      );
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function sendMessage(message: string) {
    const text = message.trim();
    if (!text || isLoading) return;

    abortVoiceInput();
    stopSpeech();
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
      className="shadow-navy-900/25 fixed inset-x-2 top-4 bottom-4 z-[70] grid grid-rows-[82px_minmax(0,1fr)_84px] overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl sm:inset-x-auto sm:top-6 sm:right-6 sm:bottom-6 sm:w-[min(calc(100vw-3rem),720px)]"
      aria-label="다유 챗봇"
    >
      <header className="from-navy-700 via-navy-600 to-brand-600 relative overflow-hidden bg-gradient-to-br px-5 py-4 text-white">
        <div className="bg-brand-300/25 pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl" />
        <div className="bg-gold-300/20 pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <DaiyuAvatar size="lg" className="ring-white/30" />
            <div className="min-w-0">
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white/90 ring-1 ring-white/15">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                다유
              </span>
              <strong className="block text-base leading-tight font-extrabold">
                무장애 여행 상담
              </strong>
              <span className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
                <span className="bg-brand-200 h-1.5 w-1.5 rounded-full" />
                대전 접근성 정보 확인 중
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={!ttsSupported}
              onClick={toggleAutoTts}
              aria-pressed={isAutoTtsEnabled}
              aria-label={isAutoTtsEnabled ? "자동 읽기 끄기" : "자동 읽기 켜기"}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/12 px-2.5 text-xs font-extrabold text-white/90 ring-1 ring-white/15 transition-colors hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isAutoTtsEnabled ? (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">자동 읽기</span>
              <span>{isAutoTtsEnabled ? "ON" : "OFF"}</span>
            </button>
            <label className="sr-only" htmlFor="daiyu-tts-voice">
              읽어주기 목소리 선택
            </label>
            <select
              id="daiyu-tts-voice"
              value={displayedVoiceURI}
              disabled={!ttsSupported || allowedTtsVoices.length === 0}
              onChange={(event) => {
                const voiceURI = event.target.value;
                stopSpeech();
                setSelectedVoiceURI(voiceURI);

                if (voiceURI) {
                  window.localStorage.setItem(TTS_VOICE_STORAGE_KEY, voiceURI);
                } else {
                  window.localStorage.removeItem(TTS_VOICE_STORAGE_KEY);
                }
              }}
              className="hidden h-9 max-w-[172px] rounded-xl border border-white/20 bg-white/12 px-2 text-xs font-bold text-white transition-colors outline-none hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-45 sm:block"
              aria-label="읽어주기 목소리 선택"
            >
              {allowedTtsVoices.length === 0 ? (
                <option value="">선택 가능한 음성 없음</option>
              ) : null}
              {allowedTtsVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                abortVoiceInput();
                stopSpeech();
                onClose();
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/85 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="채팅창 닫기"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
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
              <div className="from-navy-600 to-brand-600 shadow-brand-900/10 max-w-[78%] rounded-2xl rounded-br-md bg-gradient-to-br px-4 py-3 text-[16px] leading-relaxed font-semibold text-white shadow-md">
                {message.text}
              </div>
            </div>
          ) : (
            <div key={message.id} ref={isLatest ? latestMessageRef : null}>
              <AssistantMessage
                messageId={message.id}
                response={message.content}
                disabled={isLoading}
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
        className="flex items-center gap-2.5 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={isListening ? "듣는 중이에요..." : "메시지를 입력하세요..."}
          aria-label="질문 입력"
          disabled={isLoading}
          className="focus:border-brand-400 min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[16px] transition-colors outline-none placeholder:text-gray-400 focus:bg-white disabled:opacity-60"
        />
        <button
          type="button"
          disabled={isLoading || !sttSupported}
          onClick={toggleVoiceInput}
          aria-pressed={isListening}
          aria-label={isListening ? "음성 입력 중지" : "음성으로 질문 입력"}
          title={
            sttSupported
              ? isListening
                ? "음성 입력 중지"
                : "음성으로 질문 입력"
              : "이 브라우저는 음성 입력을 지원하지 않아요"
          }
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
            isListening
              ? "border-red-300 bg-red-500 shadow-red-500/20 hover:bg-red-600"
              : "border-brand-200 bg-brand-500 shadow-brand-500/15 hover:bg-brand-600"
          }`}
        >
          {isListening ? (
            <MicOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Mic className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="from-navy-600 to-brand-500 shadow-brand-500/20 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all hover:scale-105 disabled:scale-100 disabled:opacity-40"
          aria-label="전송"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="sr-only" aria-live="polite">
          {voiceInputStatus}
        </span>
      </form>
    </section>
  );
}

function isKoreanVoice(voice: SpeechSynthesisVoice) {
  return voice.lang.toLowerCase().startsWith("ko") || /korean|한국|대한민국/i.test(voice.name);
}

function isAllowedTtsVoice(voice: SpeechSynthesisVoice) {
  const voiceLabel = `${voice.name} ${voice.voiceURI}`;

  return isKoreanVoice(voice) && /유나|yuna|google|구글/i.test(voiceLabel);
}

function isSpeechSynthesisSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
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

function getStoredTtsVoiceURI() {
  if (typeof window === "undefined") return "";

  return window.localStorage.getItem(TTS_VOICE_STORAGE_KEY) || "";
}

function getSelectedKoreanVoice(voices: SpeechSynthesisVoice[], selectedVoiceURI: string) {
  const selectedVoice = voices.find(
    (voice) => voice.voiceURI === selectedVoiceURI && isAllowedTtsVoice(voice)
  );
  if (selectedVoice) return selectedVoice;

  return getPreferredKoreanVoice(voices);
}

function getPreferredKoreanVoice(voices: SpeechSynthesisVoice[]) {
  const allowedTtsVoices = voices.filter(isAllowedTtsVoice);
  if (!allowedTtsVoices.length) return null;

  return (
    allowedTtsVoices.find((voice) => /유나|yuna/i.test(voice.name)) ||
    allowedTtsVoices.find((voice) => /google|구글/i.test(`${voice.name} ${voice.voiceURI}`)) ||
    allowedTtsVoices[0]
  );
}

function DaiyuAvatar({ size = "md", className = "" }: { size?: "md" | "lg"; className?: string }) {
  const sizeClass = size === "lg" ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-2xl";
  const imageSize = size === "lg" ? 56 : 44;

  return (
    <span
      className={`${sizeClass} shadow-brand-500/20 ring-brand-100 shrink-0 overflow-hidden bg-white shadow-sm ring-1 ${className}`}
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
        <p className="text-[17px] leading-8 font-semibold whitespace-pre-line text-gray-950 sm:text-[18px] sm:leading-9">
          {response.message}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
            className="border-brand-200 text-brand-700 hover:border-brand-400 hover:bg-brand-50 inline-flex min-h-10 items-center gap-2 rounded-full border bg-white px-3 py-2 text-[13px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
            aria-label={isSpeaking ? "답변 읽기 중지" : "답변 읽어주기"}
          >
            {isSpeaking ? (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
            {isSpeaking ? "읽기 중지" : "읽어주기"}
          </button>
          {!ttsSupported ? (
            <span className="text-[12px] font-semibold text-gray-400">
              이 브라우저는 읽어주기를 지원하지 않아요.
            </span>
          ) : null}
        </div>

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
              개발자 정보
            </summary>
            {response.debug ? (
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
                  내부 출처
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
