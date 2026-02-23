import type { ZodSchema } from "zod";
import { apiError } from "@/lib/api/response";

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false as const, response: apiError("Invalid JSON body.", 400, "INVALID_JSON") };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      response: apiError("Invalid request body.", 400, "INVALID_BODY", parsed.error.flatten())
    };
  }

  return { ok: true as const, data: parsed.data };
}

export function sanitizeText(value: unknown, maxLength: number) {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, maxLength);
}
