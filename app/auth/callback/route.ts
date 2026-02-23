import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getNextPath(value: string | null) {
  if (!value) return "/dashboard";
  return value.startsWith("/") ? value : "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getNextPath(url.searchParams.get("next"));
  const origin = `${url.protocol}//${url.host}`;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=missing_code`);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes("pkce") || normalized.includes("code verifier")) {
      return NextResponse.redirect(`${origin}/auth?error=pkce_verifier_missing`);
    }
    return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
