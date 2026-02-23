import { NextResponse } from "next/server";

function getNextPath(value: string | null) {
  if (!value) return "/dashboard";
  return value.startsWith("/") ? value : "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getNextPath(url.searchParams.get("next"));
  const origin = `${url.protocol}//${url.host}`;
  const params = new URLSearchParams(url.searchParams);
  params.set("next", next);
  return NextResponse.redirect(`${origin}/auth?${params.toString()}`);
}
