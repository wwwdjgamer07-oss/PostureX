import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseRetryFetch } from "@/lib/supabase/retryFetch";
import { getClientIp, rateLimit } from "@/lib/security";

const ADMIN_OTP_COOKIE = "px_admin_otp_verified";
const API_RATE_DEFAULT = { prefix: "*", limit: 120, windowMs: 60_000 };
const API_RATE_RULES: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: "/api/ai/coach", limit: 40, windowMs: 60_000 },
  { prefix: "/api/admin/live/overview", limit: 30, windowMs: 60_000 },
  { prefix: "/api/create-order", limit: 20, windowMs: 60_000 },
  { prefix: "/api/verify-payment", limit: 20, windowMs: 60_000 },
  { prefix: "/api/reports", limit: 30, windowMs: 60_000 }
];

function resolveApiRateLimit(pathname: string) {
  return API_RATE_RULES.find((rule) => pathname.startsWith(rule.prefix)) ?? API_RATE_DEFAULT;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const normalized = pathname.toLowerCase();
  const isNextInternal = pathname.startsWith("/_next");
  const isStaticAsset = /\.[a-z0-9]+$/i.test(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  // Never run auth/session logic for framework internals or static assets.
  if (isNextInternal || isStaticAsset) {
    return NextResponse.next();
  }

  if (isApiRoute) {
    const ip = getClientIp(request);
    const rule = resolveApiRateLimit(pathname);
    const key = `${ip}:${rule.prefix === "*" ? pathname : rule.prefix}`;
    const result = rateLimit(key, rule.limit, rule.windowMs);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rule.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
            "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)))
          }
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(rule.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
    return response;
  }

  // Normalize common malformed/case-variant routes before auth checks.
  if (pathname === "/Dashboard") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname === "/Profile") {
    return NextResponse.redirect(new URL("/profile", request.url));
  }
  if (pathname === "/Auth") {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  if (normalized === "/dashboardprofileauth" || normalized === "/dashboardprofile") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const supabaseAnonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        fetch: supabaseRetryFetch
      },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect routes
  if (!user && (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/admin")
  )) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (user && pathname.startsWith("/admin") && !pathname.startsWith("/admin/verify")) {
    const otpRequired = String(process.env.ADMIN_OTP_CODE ?? "").trim().length > 0;
    if (otpRequired) {
      const verified = request.cookies.get(ADMIN_OTP_COOKIE)?.value === "1";
      if (!verified) {
        const verifyUrl = new URL("/admin/verify", request.url);
        verifyUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(verifyUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
