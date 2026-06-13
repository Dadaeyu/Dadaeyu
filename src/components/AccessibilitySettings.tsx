"use client";

import { useState } from "react";

const settingsConfig = [
  { key: "screenReader" as const, label: "스크린리더", description: "화면 읽기 기능" },
  { key: "highContrast" as const, label: "고대비", description: "높은 대비 색상" },
  { key: "darkMode" as const, label: "다크모드", description: "어두운 테마" }
];

type Settings = Record<(typeof settingsConfig)[number]["key"], boolean>;

const ZOOM_MIN = 100;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

interface Props {
  onClose: () => void;
}

export default function AccessibilitySettings({ onClose }: Props) {
  const [settings, setSettings] = useState<Settings>({
    screenReader: false,
    highContrast: false,
    darkMode: false
  });
  const [zoom, setZoom] = useState(100);

  const toggle = (key: keyof Settings) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const decreaseZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(ZOOM_MIN, prev - ZOOM_STEP));
  };

  const increaseZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(ZOOM_MAX, prev + ZOOM_STEP));
  };

  return (
    <>
      {/* 배경 클릭 시 닫기 */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute top-full right-4 z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
        <p className="mb-2 px-1 text-xs font-semibold text-gray-500">접근성 설정</p>
        <div className="space-y-1">
          {settingsConfig.map(({ key, label, description }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-gray-50"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
              {/* 토글 스위치 */}
              <div
                className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${settings[key] ? "bg-brand-500" : "bg-gray-200"}`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${settings[key] ? "left-5" : "left-1"}`}
                />
              </div>
            </button>
          ))}

          {/* 화면 확대 — 맨 아래 */}
          <div className="flex w-full items-center justify-between rounded-lg px-2 py-2">
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">화면 확대</p>
              <p className="text-xs text-gray-400">텍스트 크기 증가</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={decreaseZoom}
                disabled={zoom <= ZOOM_MIN}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="화면 축소"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-semibold text-gray-800 tabular-nums">
                {zoom}%
              </span>
              <button
                onClick={increaseZoom}
                disabled={zoom >= ZOOM_MAX}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="화면 확대"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
