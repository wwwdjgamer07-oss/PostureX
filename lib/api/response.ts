import { NextResponse } from "next/server";

interface ApiErrorPayload {
  error: string;
  code?: string;
  details?: unknown;
}

export function apiError(message: string, status = 400, code?: string, details?: unknown) {
  const payload: ApiErrorPayload = { error: message };
  if (code) payload.code = code;
  if (typeof details !== "undefined") payload.details = details;
  return NextResponse.json(payload, { status });
}

export function apiOk<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}
