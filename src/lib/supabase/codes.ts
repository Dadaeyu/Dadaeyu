/** tb_code.code_group — 회원가입/온보딩/프로필 선호 테마 */
export const THEME_CODE_GROUP = "CONTENTTYPE";

/** tb_code.code_group — 여행 접근성 니즈 */
export const BARRIERFREE_CODE_GROUP = "BARRIERFREE";

export type ThemeCodeOption = {
  code_id: string;
  code_nm: string;
};

export type CodeOption = ThemeCodeOption;

export function parseStringListFromMetadata(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const values = raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return values.length > 0 ? values : null;
}

/** @deprecated use parseStringListFromMetadata */
export function parseThemePreferencesFromMetadata(raw: unknown): string[] | null {
  return parseStringListFromMetadata(raw);
}

export function parseAccessibilityNeedsFromMetadata(raw: unknown): string[] | null {
  return parseStringListFromMetadata(raw);
}

export async function fetchThemePreferenceOptions(): Promise<CodeOption[]> {
  const res = await fetch("/api/codes/theme-preferences");
  if (!res.ok) {
    throw new Error("테마 목록을 불러오지 못했습니다.");
  }
  const data = (await res.json()) as { themes?: CodeOption[] };
  return data.themes ?? [];
}

export async function fetchAccessibilityNeedOptions(): Promise<CodeOption[]> {
  const res = await fetch("/api/codes/accessibility-needs");
  if (!res.ok) {
    throw new Error("접근성 목록을 불러오지 못했습니다.");
  }
  const data = (await res.json()) as { items?: CodeOption[] };
  return data.items ?? [];
}
