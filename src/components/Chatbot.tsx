"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Bot } from "lucide-react";

interface Message {
  id: number;
  role: "bot" | "user";
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  { id: 0, role: "bot", text: "안녕하세요! 대전 무장애 여행 도우미입니다 😊\n궁금한 여행지나 코스를 알려드릴게요!" },
];

const BOT_REPLIES: Record<string, string> = {
  default: "죄송해요, 아직 해당 질문에 대한 답변을 준비 중이에요. 다른 질문을 해주세요!",
};

function getBotReply(text: string): string {
  const t = text.trim();
  if (t.includes("성심당")) return "성심당은 대전의 대표 빵집으로, 휠체어 접근이 가능한 1층 매장이 있습니다. 본점은 중구 은행동에 위치해요!";
  if (t.includes("엑스포") || t.includes("과학공원")) return "대전 엑스포 과학공원은 무장애 탐방로와 전동 휠체어 대여 서비스를 제공합니다. 입장료는 성인 2,000원이에요.";
  if (t.includes("수목원") || t.includes("한밭")) return "한밭수목원은 평탄한 산책로가 잘 갖춰져 있어 휠체어·유모차 이용이 편리합니다. 입장 무료예요!";
  if (t.includes("코스") || t.includes("추천")) return "하루 코스 추천드려요: 성심당 → 한밭수목원 → 엑스포 과학공원 순서로 이동하면 이동 거리도 짧고 무장애 시설이 잘 되어 있어요.";
  if (t.includes("교통") || t.includes("버스") || t.includes("지하철")) return "대전 지하철 1호선은 전 역사에 엘리베이터가 설치되어 있습니다. 저상버스 노선 정보는 대전 교통정보 앱에서 확인하세요!";
  if (t.includes("화장실") || t.includes("장애인")) return "대전 주요 관광지 대부분 장애인 화장실이 설치되어 있어요. 구체적인 위치는 지도 메뉴에서 확인하실 수 있습니다.";
  return BOT_REPLIES.default;
}

interface Props {
  onClose: () => void;
}

export default function Chatbot({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now(), role: "user", text };
    const botMsg: Message = { id: Date.now() + 1, role: "bot", text: getBotReply(text) };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-24 right-4 z-50 w-80 flex flex-col rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
      style={{ height: "420px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold text-sm">무장애 여행 도우미</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-brand-700 transition-colors"
          aria-label="채팅창 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-white shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-brand-400 transition-colors"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label="전송"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
