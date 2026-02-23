import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseRetryFetch } from "@/lib/supabase/retryFetch";

const ADMIN_OTP_COOKIE = "px_admin_otp_verified";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const normalized = pathname.toLowerCase();
  const isNextInternal = pathname.startsWith("/_next");
  const isStaticAsset = /\.[a-z0-9]+$/i.test(pathname);

  // Never run auth/session logic for framework internals or static assets.
  if (isNextInternal || isStaticAsset) {
    return NextResponse.next();
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
