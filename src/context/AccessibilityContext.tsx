"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyAccessibilityState,
  clampFontScale,
  DEFAULT_A11Y_STATE,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  getSpeakableText,
  loadAccessibilityState,
  saveAccessibilityState,
  type AccessibilityState,
} from "@/lib/accessibility";
import { useOptionalAuth } from "@/context/AuthContext";
import { updateUserPreferences } from "@/lib/supabase/member";

interface AccessibilityContextValue extends AccessibilityState {
  toggleDarkMode: () => void;
  toggleHighContrast: () => void;
  toggleReadAloud: () => void;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
  setFontScale: (value: number) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null
);

function prefsToA11yState(prefs: {
  dark_mode: boolean;
  high_contrast: boolean;
  font_scale: number;
  read_aloud: boolean;
}): AccessibilityState {
  return {
    darkMode: prefs.dark_mode,
    highContrast: prefs.high_contrast,
    fontScale: prefs.font_scale,
    readAloud: prefs.read_aloud,
  };
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const auth = useOptionalAuth();
  const [state, setState] = useState<AccessibilityState>(DEFAULT_A11Y_STATE);
  const lastSpoken = useRef<string | null>(null);
  const loaded = useRef(false);
  const syncedFromDb = useRef(false);

  useEffect(() => {
    const saved = loadAccessibilityState();
    loaded.current = true;
    setState(saved);
    applyAccessibilityState(saved);
  }, []);

  useEffect(() => {
    if (!auth?.preferences || syncedFromDb.current) return;
    const fromDb = prefsToA11yState(auth.preferences);
    syncedFromDb.current = true;
    setState(fromDb);
    applyAccessibilityState(fromDb);
    saveAccessibilityState(fromDb);
  }, [auth?.preferences]);

  useEffect(() => {
    if (!auth?.user) syncedFromDb.current = false;
  }, [auth?.user]);

  const persistState = useCallback(
    (next: AccessibilityState) => {
      applyAccessibilityState(next);
      saveAccessibilityState(next);
      if (auth?.user) {
        updateUserPreferences(auth.user.id, {
          dark_mode: next.darkMode,
          high_contrast: next.highContrast,
          font_scale: next.fontScale,
          read_aloud: next.readAloud,
        }).catch(() => {});
      }
    },
    [auth?.user]
  );

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (lastSpoken.current === text) return;

    lastSpoken.current = text;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (!state.readAloud) {
      lastSpoken.current = null;
      window.speechSynthesis?.cancel();
      return;
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const text = getSpeakableText(target);
      if (text) speak(text);
    };

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const interactive = target.closest(
        "button, a, [role='button'], [role='link'], input, textarea, select"
      );
      if (!interactive || interactive !== target) return;

      const text = getSpeakableText(interactive);
      if (text) speak(text);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("mouseover", handleMouseOver);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("mouseover", handleMouseOver);
      window.speechSynthesis?.cancel();
    };
  }, [state.readAloud, speak]);

  const updateState = useCallback(
    (updater: (prev: AccessibilityState) => AccessibilityState) => {
      if (!loaded.current) return;
      setState((prev) => {
        const next = updater(prev);
        persistState(next);
        return next;
      });
    },
    [persistState]
  );

  const toggleDarkMode = useCallback(() => {
    updateState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, [updateState]);

  const toggleHighContrast = useCallback(() => {
    updateState((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, [updateState]);

  const toggleReadAloud = useCallback(() => {
    updateState((prev) => ({ ...prev, readAloud: !prev.readAloud }));
  }, [updateState]);

  const setFontScale = useCallback(
    (value: number) => {
      updateState((prev) => ({
        ...prev,
        fontScale: clampFontScale(value),
      }));
    },
    [updateState]
  );

  const increaseFontScale = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      fontScale: clampFontScale(prev.fontScale + FONT_SCALE_STEP),
    }));
  }, [updateState]);

  const decreaseFontScale = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      fontScale: clampFontScale(prev.fontScale - FONT_SCALE_STEP),
    }));
  }, [updateState]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...state,
      toggleDarkMode,
      toggleHighContrast,
      toggleReadAloud,
      increaseFontScale,
      decreaseFontScale,
      setFontScale,
    }),
    [
      state,
      toggleDarkMode,
      toggleHighContrast,
      toggleReadAloud,
      increaseFontScale,
      decreaseFontScale,
      setFontScale,
    ]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}

export { FONT_SCALE_MIN, FONT_SCALE_MAX, FONT_SCALE_STEP };
