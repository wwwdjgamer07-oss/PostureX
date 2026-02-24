import { createBrowserClient } from "@supabase/ssr";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    return { url, anonKey };
  }

  // During Next.js prerender in server context, avoid crashing the build.
  // Real credentials are still required at runtime in the browser.
  if (typeof window === "undefined") {
    return {
      url: "https://placeholder.supabase.co",
      anonKey: "placeholder-anon-key"
    };
  }

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return { url, anonKey };
}

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    }
  });
}

export const createClient = createBrowserSupabaseClient;
