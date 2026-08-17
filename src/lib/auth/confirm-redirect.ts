export function buildEmailConfirmRedirectUrl(origin: string, next?: string): string {
  const redirectTo = new URL("/auth/confirm", origin);
  if (next) redirectTo.searchParams.set("next", next);
  return redirectTo.toString();
}
