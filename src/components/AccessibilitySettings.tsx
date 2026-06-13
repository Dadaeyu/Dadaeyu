"use client";

import { useState } from "react";

const settingsConfig = [
  { key: "screenReader" as const, label: "스크린리더", description: "화면 읽기 기능" },
  { key: "highContrast" as const, label: "고대비", description: "높은 대비 색상" },
  { key: "darkMode" as const, label: "다크모드", description: "어두운 테마" },
];

type Settings = Record<typeof settingsConfig[number]["key"], boolean>;

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
    darkMode: false,
  });
  const [zoom, setZoom] = useState(100);

  const toggle = (key: keyof Settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

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

      <div className="absolute right-4 top-full mt-2 z-50 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2 px-1">접근성 설정</p>
        <div className="space-y-1">
          {settingsConfig.map(({ key, label, description }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
              {/* 토글 스위치 */}
              <div
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  settings[key] ? "bg-brand-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                    settings[key] ? "left-5" : "left-1"
                  }`}
                />
              </div>
            </button>
          ))}

          {/* 화면 확대 — 맨 아래 */}
          <div className="w-full flex items-center justify-between px-2 py-2 rounded-lg">
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">화면 확대</p>
              <p className="text-xs text-gray-400">텍스트 크기 증가</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={decreaseZoom}
                disabled={zoom <= ZOOM_MIN}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold text-sm transition-colors"
                aria-label="화면 축소"
              >
                −
              </button>
              <span className="text-sm font-semibold text-gray-800 w-10 text-center tabular-nums">
                {zoom}%
              </span>
              <button
                onClick={increaseZoom}
                disabled={zoom >= ZOOM_MAX}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold text-sm transition-colors"
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
