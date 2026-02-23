"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Login error:", error);
      alert("Error logging in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950">
      <button
        onClick={handleLogin}
        disabled={loading}
        className="rounded bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Sign in with Google"}
      </button>
    </div>
  );
}
