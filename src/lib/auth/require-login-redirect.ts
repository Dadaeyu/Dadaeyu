/** 비로그인 시 안내 후 로그인 화면으로 이동. 로그인돼 있으면 true */
export function requireLoginOrRedirect(
  user: { id: string } | null | undefined,
  router: { push: (href: string) => void },
  nextPath: string,
  message = "로그인이 필요합니다. 로그인 화면으로 이동합니다."
): boolean {
  if (user) return true;
  window.alert(message);
  router.push(`/login?next=${encodeURIComponent(nextPath)}`);
  return false;
}
