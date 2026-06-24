"use client";

import {
  useAccessibility,
  FONT_SCALE_MIN,
  FONT_SCALE_MAX,
} from "@/context/AccessibilityContext";

const settingsConfig = [
  {
    key: "readAloud" as const,
    label: "음성 읽어주기",
    description: "포커스 시 내용 음성 안내",
    toggle: "toggleReadAloud" as const,
  },
  {
    key: "highContrast" as const,
    label: "고대비",
    description: "높은 대비 색상",
    toggle: "toggleHighContrast" as const,
  },
  {
    key: "darkMode" as const,
    label: "다크모드",
    description: "어두운 테마",
    toggle: "toggleDarkMode" as const,
  },
];

interface Props {
  onClose: () => void;
}

export default function AccessibilitySettings({ onClose }: Props) {
  const {
    readAloud,
    highContrast,
    darkMode,
    fontScale,
    toggleReadAloud,
    toggleHighContrast,
    toggleDarkMode,
    increaseFontScale,
    decreaseFontScale,
  } = useAccessibility();

  const values = { readAloud, highContrast, darkMode };
  const toggles = {
    toggleReadAloud,
    toggleHighContrast,
    toggleDarkMode,
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="접근성 설정"
        className="absolute right-4 top-full mt-2 z-50 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-3"
      >
        <p className="text-xs font-semibold text-gray-500 mb-2 px-1">접근성 설정</p>
        <div className="space-y-1">
          {settingsConfig.map(({ key, label, description, toggle }) => (
            <button
              key={key}
              type="button"
              onClick={toggles[toggle]}
              className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              aria-pressed={values[key]}
            >
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
              <div
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  values[key] ? "bg-brand-500" : "bg-gray-200"
                }`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                    values[key] ? "left-5" : "left-1"
                  }`}
                />
              </div>
            </button>
          ))}

          <div className="w-full flex items-center justify-between px-2 py-2 rounded-lg">
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">화면 확대</p>
              <p className="text-xs text-gray-400">텍스트 크기 증가</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={decreaseFontScale}
                disabled={fontScale <= FONT_SCALE_MIN}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold text-sm transition-colors"
                aria-label="화면 축소"
              >
                −
              </button>
              <span
                className="text-sm font-semibold text-gray-800 w-10 text-center tabular-nums"
                aria-live="polite"
              >
                {fontScale}%
              </span>
              <button
                type="button"
                onClick={increaseFontScale}
                disabled={fontScale >= FONT_SCALE_MAX}
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
