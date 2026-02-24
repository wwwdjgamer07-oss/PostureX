"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { resolveStartRoute } from "@/lib/subscriptionGate";

interface StartFreeButtonProps {
  className?: string;
  children: React.ReactNode;
}

export function StartFreeButton({ className, children }: StartFreeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      className={className}
      onClick={() => {
        void (async () => {
          setLoading(true);
          const nextRoute = await resolveStartRoute();
          router.push(nextRoute);
          setLoading(false);
        })();
      }}
    >
      {children}
    </button>
  );
}
