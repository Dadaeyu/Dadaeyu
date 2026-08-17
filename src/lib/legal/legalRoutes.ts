export const LEGAL_LINKS = [
  { href: "/privacy", label: "개인정보 처리방침" },
  { href: "/account-deletion", label: "회원 탈퇴 안내" }
] as const;

const PUBLIC_LEGAL_PATHS = new Set<string>(LEGAL_LINKS.map(({ href }) => href));
const INLINE_LEGAL_LINK_PATHS = new Set(["/login", "/signup", "/forgot-password", "/find-email"]);

export function isPublicLegalPath(pathname: string): boolean {
  return PUBLIC_LEGAL_PATHS.has(pathname);
}

export function shouldShowGlobalLegalFooter(pathname: string): boolean {
  const hasInlineLegalLinks =
    INLINE_LEGAL_LINK_PATHS.has(pathname) ||
    pathname.startsWith("/signup/") ||
    pathname.startsWith("/auth/");
  const isImmersivePage =
    pathname === "/map" ||
    pathname.startsWith("/map/") ||
    pathname === "/course" ||
    pathname.startsWith("/course/");

  return !isPublicLegalPath(pathname) && !hasInlineLegalLinks && !isImmersivePage;
}
