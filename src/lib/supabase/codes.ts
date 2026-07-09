export const THEME_CODE_IDS = [12, 14, 15, 25, 28, 32, 38, 39] as const;

export type ThemeCodeOption = {
  code_id: string;
  code_nm: string;
};

export function parseThemePreferencesFromMetadata(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const values = raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return values.length > 0 ? values : null;
}

export async function fetchThemePreferenceOptions(): Promise<ThemeCodeOption[]> {
  const res = await fetch("/api/codes/theme-preferences");
  if (!res.ok) {
    throw new Error("테마 목록을 불러오지 못했습니다.");
  }
  const data = (await res.json()) as { themes?: ThemeCodeOption[] };
  return data.themes ?? [];
}
