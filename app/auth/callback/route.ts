import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getNextPath(value: string | null) {
  if (!value) return "/dashboard";
  return value.startsWith("/") ? value : "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getNextPath(url.searchParams.get("next"));
  const origin = `${url.protocol}//${url.host}`;
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("OAuth callback exchange failed", error);
      const failParams = new URLSearchParams();
      failParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(`${origin}/auth?${failParams.toString()}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
