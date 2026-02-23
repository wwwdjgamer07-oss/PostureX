"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { GlowBackground } from "@/components/GlowBackground";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function IntroAnimation() {
  const router = useRouter();
  const redirectedRef = useRef(false);

  const goDashboard = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.push("/dashboard");
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(goDashboard, 3500);
    return () => {
      clearTimeout(timer);
    };
  }, [goDashboard]);

  return (
    <section className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      <GlowBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 text-center">
        <AnimatedLogo />

        <motion.h1
          initial={{ y: 30, opacity: 0, filter: "blur(12px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 0.55, ease }}
          style={{ willChange: "transform, opacity, filter", transform: "translate3d(0,0,0)" }}
          className="mt-7 text-4xl font-semibold tracking-tight text-white sm:text-5xl"
        >
          MRX AI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.85, ease }}
          className="mt-3 max-w-md text-sm text-slate-300 sm:text-base"
        >
          Real-time posture intelligence
        </motion.p>

        <motion.button
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.05, ease }}
          onClick={goDashboard}
          style={{ willChange: "transform, opacity", transform: "translate3d(0,0,0)" }}
          className="mt-8 rounded-2xl border border-cyan-300/40 bg-slate-900/55 px-8 py-3 text-sm font-medium text-cyan-100 shadow-[0_0_36px_rgba(0,200,255,0.28)] backdrop-blur-xl transition hover:border-cyan-200/60 hover:bg-slate-800/65"
        >
          Start
        </motion.button>
      </div>
    </section>
  );
}
