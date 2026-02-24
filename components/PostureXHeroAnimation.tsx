"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Activity, Camera, ChevronRight, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { StartFreeButton } from "@/components/StartFreeButton";

function FloatingCard({
  title,
  subtitle,
  className,
  delay,
  icon: Icon
}: {
  title: string;
  subtitle: string;
  className: string;
  delay: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.45, delay },
        y: { duration: 4 + delay * 2, repeat: Infinity, ease: "easeInOut", delay }
      }}
      className={`px-hero-floating-card absolute z-20 w-56 rounded-2xl border border-slate-200/75 bg-white/88 p-4 text-left shadow-[0_20px_50px_rgba(29,78,216,0.14)] backdrop-blur-xl dark:border-white/15 dark:bg-[#111936]/90 dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="px-hero-floating-icon grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/35 bg-cyan-400/12 text-cyan-700 dark:border-cyan-200/30 dark:bg-cyan-300/10 dark:text-cyan-100">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">{title}</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{subtitle}</p>
        </div>
      </div>
      <div className="px-hero-floating-progress mt-3 h-1.5 overflow-hidden rounded-full bg-slate-300/80 dark:bg-slate-700/80">
        <motion.div
          className="px-hero-floating-progress-bar h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
          animate={{ x: ["-45%", "120%"] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear", delay: delay + 0.7 }}
        />
      </div>
    </motion.article>
  );
}

export function PostureXHeroAnimation() {
  const blobX = useMotionValue(0);
  const blobY = useMotionValue(0);
  const springX = useSpring(blobX, { stiffness: 90, damping: 20, mass: 0.8 });
  const springY = useSpring(blobY, { stiffness: 90, damping: 20, mass: 0.8 });

  const stars = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 7) % 100}%`,
        top: `${(i * 29 + 9) % 100}%`,
        delay: (i % 9) * 0.3
      })),
    []
  );

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;
    blobX.set(relativeX * 36);
    blobY.set(relativeY * 20);
  }

  function handlePointerLeave() {
    blobX.set(0);
    blobY.set(0);
  }

  return (
    <section
      className="px-hero-shell relative overflow-hidden rounded-[28px] border border-slate-300/65 bg-[#f8fbff] px-4 py-6 dark:border-white/10 dark:bg-[#070d21] sm:px-7 sm:py-8"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(41,98,255,0.22),transparent_60%)] dark:bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(67,111,255,0.36),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(65%_60%_at_20%_25%,rgba(0,229,255,0.12),transparent_70%)] dark:bg-[radial-gradient(65%_60%_at_20%_25%,rgba(57,204,255,0.14),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_80%_25%,rgba(41,98,255,0.16),transparent_72%)] dark:bg-[radial-gradient(55%_45%_at_80%_25%,rgba(122,98,255,0.2),transparent_72%)]" />
        {stars.map((star) => (
          <motion.span
            key={star.id}
            className="absolute h-[2px] w-[2px] rounded-full bg-cyan-500/35 dark:bg-cyan-100/70"
            style={{ left: star.left, top: star.top }}
            animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.35, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: star.delay }}
          />
        ))}
      </div>

      <div className="relative">
        <div className="px-hero-inner relative mx-auto flex min-h-[500px] max-w-5xl items-center justify-center overflow-hidden rounded-[28px] border border-slate-300/70 bg-gradient-to-b from-[#f7fbff]/96 to-[#edf3ff]/96 px-4 pb-20 pt-24 text-center dark:border-white/10 dark:bg-gradient-to-b dark:from-[#0b1330]/70 dark:to-[#090f28]/90 sm:px-8 sm:pb-24 sm:pt-28">
          <FloatingCard title="Posture Dashboard" subtitle="Alignment 94%" icon={Activity} delay={0.2} className="left-6 top-6 hidden xl:block" />
          <FloatingCard title="Camera Tracking" subtitle="Skeleton lock active" icon={Camera} delay={0.45} className="right-6 top-6 hidden xl:block" />

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="relative z-30 mx-auto max-w-3xl"
          >
            <p className="px-hero-chip inline-flex items-center gap-2 rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-700 dark:border-cyan-300/35 dark:text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              AI Posture System
            </p>
            <h1 className="mt-5 text-3xl font-semibold leading-[1.05] text-slate-900 dark:text-white sm:text-5xl">
              Engineered posture intelligence
              <br className="hidden sm:block" /> for extreme people
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              Live tracking, fatigue warnings, and coaching insights in one streamlined performance cockpit.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="px-hero-cta-secondary rounded-xl border border-slate-300/70 bg-white/72 px-5 py-3 text-sm font-semibold text-slate-800 dark:border-white/25 dark:bg-white/5 dark:text-white">
                Main Menu
              </Link>
              <StartFreeButton className="px-hero-cta-primary inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/18 px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_0_28px_rgba(34,211,238,0.22)] dark:border-cyan-200/40 dark:bg-cyan-400/20 dark:text-white dark:shadow-[0_0_28px_rgba(34,211,238,0.3)] disabled:opacity-60">
                View Plans <ChevronRight className="h-4 w-4" />
              </StartFreeButton>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0.7, scale: 0.95 }}
            animate={{ opacity: 1, scale: [1, 1.05, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ x: springX, y: springY }}
            className="hero-blob px-hero-blob absolute -bottom-24 left-1/2 h-[250px] w-[420px] -translate-x-1/2 rounded-[55%_45%_52%_48%/52%_47%_53%_48%] bg-gradient-to-b from-[#4b58ff]/30 via-[#2c3ccf]/20 to-[#121a53]/12 dark:from-[#4b58ff]/45 dark:via-[#2c3ccf]/35 dark:to-[#121a53]/20 blur-[2px] sm:h-[280px] sm:w-[460px]"
          />
        </div>
      </div>
    </section>
  );
}

export default PostureXHeroAnimation;
