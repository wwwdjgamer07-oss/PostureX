const RETRYABLE_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN"]);

function isRetryableNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const cause = (error as Error & { cause?: unknown }).cause as
    | { code?: string; errno?: string | number }
    | undefined;
  const code = String(cause?.code ?? cause?.errno ?? "");
  return RETRYABLE_CODES.has(code);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canRetry(requestInfo: RequestInfo | URL, init?: RequestInit) {
  const method = init?.method ?? (typeof requestInfo !== "string" && "method" in requestInfo ? requestInfo.method : "GET");
  return method === "GET" || method === "HEAD";
}

export async function supabaseRetryFetch(input: RequestInfo | URL, init?: RequestInit) {
  const attempts = canRetry(input, init) ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableNetworkError(error)) {
        throw error;
      }
      await sleep(120 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown fetch failure.");
}
