export const LEGAL_LINKS = [
  { href: "/privacy", label: "개인정보 처리방침" },
  { href: "/account-deletion", label: "회원 탈퇴 안내" }
] as const;

const PUBLIC_LEGAL_PATHS = new Set<string>(LEGAL_LINKS.map(({ href }) => href));

export function isPublicLegalPath(pathname: string): boolean {
  return PUBLIC_LEGAL_PATHS.has(pathname);
}
