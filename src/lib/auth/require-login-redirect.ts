/** 비로그인 시 확인창으로 안내 후 확인하면 로그인 화면으로 이동(취소 시 이동 안 함). 로그인돼 있으면 true */
export async function requireLoginOrRedirect(
  user: { id: string } | null | undefined,
  router: { push: (href: string) => void },
  nextPath: string,
  confirmFn: (message: string) => boolean | Promise<boolean> = (message) => window.confirm(message)
): Promise<boolean> {
  if (user) return true;
  const message = "로그인이 필요합니다. 로그인 화면으로 이동할까요?";
  if (await confirmFn(message)) {
    router.push(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return false;
}
