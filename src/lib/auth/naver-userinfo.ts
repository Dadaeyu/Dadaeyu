type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

export type NaverUserinfoResult =
  | { readonly kind: "ok"; readonly profile: Record<string, unknown> }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "failed" };

/** Naver /v1/nid/me 는 프로필을 response 안에 중첩. Supabase는 최상위 sub/email 필요 */
export async function resolveNaverUserinfo(input: {
  readonly authorization: string | null;
  readonly fetchImpl?: FetchImpl;
}): Promise<NaverUserinfoResult> {
  if (!input.authorization) {
    return { kind: "unauthorized" };
  }

  try {
    const response = await (input.fetchImpl ?? fetch)("https://openapi.naver.com/v1/nid/me", {
      headers: { authorization: input.authorization },
    });

    if (!response.ok) {
      return { kind: "failed" };
    }

    const data = (await response.json()) as {
      readonly resultcode?: string;
      readonly response?: Record<string, unknown>;
    };

    const profile = data.response;
    if (
      data.resultcode !== "00" ||
      profile === undefined ||
      typeof profile.id !== "string" ||
      profile.id.trim() === ""
    ) {
      return { kind: "failed" };
    }

    return {
      kind: "ok",
      profile: {
        ...profile,
        sub: profile.id,
        email: typeof profile.email === "string" ? profile.email : undefined,
        name:
          typeof profile.name === "string"
            ? profile.name
            : typeof profile.nickname === "string"
              ? profile.nickname
              : undefined,
      },
    };
  } catch {
    return { kind: "failed" };
  }
}
