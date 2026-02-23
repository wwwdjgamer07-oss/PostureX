"use client";

import { useEffect } from "react";

export function AuthHashRouter() {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const searchParams = new URLSearchParams(search);
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const hashError = hashParams.get("error");
    const hashErrorCode = hashParams.get("error_code");
    const hashType = hashParams.get("type");
    const hasTokenHash = hashParams.has("access_token") || hashParams.has("refresh_token");
    const hasCodeQuery = searchParams.has("code");

    if (!hash && !hasCodeQuery) return;

    if (hashErrorCode === "otp_expired" || hashError === "access_denied") {
      if (pathname !== "/auth") {
        window.location.replace("/auth?error=verification_link_expired");
      } else if (hash) {
        window.history.replaceState({}, "", "/auth?error=verification_link_expired");
      }
      return;
    }

    if (hasTokenHash) {
      if (hashType === "recovery" && pathname !== "/reset-password") {
        window.location.replace(`/reset-password${hash}`);
        return;
      }

      if (hashType !== "recovery" && pathname !== "/auth") {
        window.location.replace(`/auth${hash}`);
      }
      return;
    }

    if (hasCodeQuery && pathname !== "/auth/callback" && pathname !== "/reset-password") {
      window.location.replace(`/auth/callback${search}`);
    }
  }, []);

  return null;
}
