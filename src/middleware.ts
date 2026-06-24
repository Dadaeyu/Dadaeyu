import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthDestination } from "@/lib/auth/post-login";

const PROTECTED_PATHS = ["/mypage", "/onboarding"];
const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/find-email"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isOnboardingExempt(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/find-email" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname === "/onboarding"
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(pathname) && user) {
    const { data: member } = await supabase
      .from("members")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if (member?.status === "suspended") {
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "account_suspended");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isOnboardingExempt(pathname)) {
    const { data: member } = await supabase
      .from("members")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (!member || !member.onboarding_completed) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      const nextPath = `${pathname}${request.nextUrl.search}`;
      onboardingUrl.search = `next=${encodeURIComponent(nextPath)}`;
      return NextResponse.redirect(onboardingUrl);
    }
  }

  if (AUTH_PATHS.includes(pathname) && user) {
    const next = request.nextUrl.searchParams.get("next") ?? "/mypage";
    const destPath = await resolveAuthDestination(supabase, user.id, next, "/mypage");
    const dest = request.nextUrl.clone();
    const [path, query] = destPath.split("?");
    dest.pathname = path;
    dest.search = query ? `?${query}` : "";
    return NextResponse.redirect(dest);
  }

  if (isAdminPath(pathname)) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: member } = await supabase
      .from("members")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (!member || member.role !== "admin" || member.status !== "active") {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
