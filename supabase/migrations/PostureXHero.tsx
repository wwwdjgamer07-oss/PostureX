"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useMemo, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Activity, BarChart3, Camera, UserCircle2 } from "lucide-react";

type OrbitCardConfig = {
  id: string;
  title: string;
  subtitle: string;
  radius: number;
  duration: number;
  initialAngle: number;
  icon: React.ComponentType<{ className?: string }>;
  depthDuration: number;
};

const ORBIT_CARDS: OrbitCardConfig[] = [
  {
    id: "dashboard",
    title: "Posture Dashboard",
    subtitle: "98% Alignment",
    radius: 220,
    duration: 26,
    initialAngle: -40,
    icon: Activity,
    depthDuration: 3.2
  },
  {
    id: "camera",
    title: "Camera Tracking",
    subtitle: "Skeleton lock active",
    radius: 250,
    duration: 30,
    initialAngle: 35,
    icon: Camera,
    depthDuration: 4.1
  },
  {
    id: "analytics",
    title: "Analytics Graph",
    subtitle: "Trend +12%",
    radius: 235,
    duration: 34,
    initialAngle: 145,
    icon: BarChart3,
    depthDuration: 4.8
  },
  {
    id: "profile",
    title: "User Profile",
    subtitle: "Live Tracking",
    radius: 210,
    duration: 29,
    initialAngle: 220,
    icon: UserCircle2,
    depthDuration: 3.8
  }
];

function OrbitingCard({
  config,
  hoveredId,
  setHoveredId
}: {
  config: OrbitCardConfig;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}) {
  const Icon = config.icon;
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 180, damping: 18 });
  const rotateY = useSpring(ry, { stiffness: 180, damping: 18 });

  const isHovered = hoveredId === config.id;

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rx.set((0.5 - py) * 12);
    ry.set((px - 0.5) * 14);
  };

  const onMouseLeave = () => {
    rx.set(0);
    ry.set(0);
    setHoveredId(null);
  };

  return (
    <div
      className="posturex-orbit absolute inset-0"
      style={
        {
          ["--orbit-duration" as string]: `${config.duration}s`,
          ["--orbit-angle" as string]: `${config.initialAngle}deg`,
          ["--orbit-play" as string]: isHovered ? "paused" : "running"
        } as CSSProperties
      }
    >
      <div className="posturex-arm" style={{ ["--orbit-radius" as string]: `${config.radius}px` } as CSSProperties}>
        <div className="posturex-connector">
          <motion.span
            animate={{ x: [0, config.radius - 28, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="posturex-connector-dot"
          />
        </div>

        <motion.article
          onMouseEnter={() => setHoveredId(config.id)}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          animate={{
            scale: isHovered ? 1.06 : [0.98, 1.02, 0.98],
            z: [0, 14, 0],
            filter: isHovered
              ? "drop-shadow(0 0 26px rgba(59,227,255,0.55))"
              : "drop-shadow(0 0 12px rgba(59,227,255,0.22))"
          }}
          transition={
            isHovered
              ? { type: "spring", stiffness: 180, damping: 16 }
              : {
                  scale: { duration: config.depthDuration, repeat: Infinity, ease: "easeInOut" },
                  z: { duration: config.depthDuration, repeat: Infinity, ease: "easeInOut" },
                  filter: { duration: 0.25 }
                }
          }
          className="posturex-card relative w-56 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/14 via-transparent to-transparent" />
          <div className="relative flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-200/35 bg-cyan-300/12 text-cyan-100">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{config.title}</p>
              <p className="text-sm font-semibold text-white">{config.subtitle}</p>
            </div>
          </div>

          {config.id === "dashboard" ? (
            <svg viewBox="0 0 180 38" className="mt-3 h-9 w-full">
              <path d="M2 28 C 30 10, 48 30, 76 14 C 105 4, 132 26, 178 12" fill="none" stroke="rgba(59,227,255,0.9)" strokeWidth="2.5" />
            </svg>
          ) : null}

          {config.id === "camera" ? (
            <div className="relative mt-3 grid h-20 place-items-center overflow-hidden rounded-xl border border-white/10 bg-slate-900/65">
              <svg viewBox="0 0 64 84" className="h-14 w-12 text-cyan-100/75">
                <path d="M32 8c6 0 10 4 10 10s-4 10-10 10-10-4-10-10S26 8 32 8Zm-16 62c0-13 7-20 16-20s16 7 16 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <motion.div
                animate={{ y: [0, 48, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-2 right-2 h-[2px] rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(59,227,255,0.75)]"
              />
            </div>
          ) : null}

          {config.id === "analytics" ? (
            <svg viewBox="0 0 190 70" className="mt-3 h-14 w-full">
              <path d="M6 58 C 34 22, 70 64, 104 26 C 132 4, 164 44, 186 16" fill="none" stroke="rgba(96,165,250,0.95)" strokeWidth="3" strokeLinecap="round" />
              <path d="M6 58 C 34 22, 70 64, 104 26 C 132 4, 164 44, 186 16" fill="none" stroke="rgba(59,227,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : null}

          {config.id === "profile" ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-cyan-200/30 bg-white/10">
                <UserCircle2 className="h-5 w-5 text-cyan-100" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Operator</p>
                <p className="inline-flex items-center gap-1 text-xs text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Live Tracking
                </p>
              </div>
            </div>
          ) : null}

          <div className="posturex-sweep" />
        </motion.article>
      </div>
    </div>
  );
}

export function PostureXHero() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: index,
        left: `${(index * 31) % 100}%`,
        top: `${(index * 17) % 100}%`,
        size: 1 + (index % 3),
        duration: 16 + (index % 8)
      })),
    []
  );

  return (
    <section className="relative min-h-[88vh] overflow-hidden bg-[#0B1220] px-6 py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,227,255,0.1),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,18,32,0.2),rgba(11,18,32,0.95))]" />

        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            className="absolute rounded-full bg-cyan-100/45"
            style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size }}
            animate={{ y: [0, -26, 0], opacity: [0.22, 0.75, 0.22], x: [0, 5, 0] }}
            transition={{ duration: particle.duration, repeat: Infinity, ease: "easeInOut", delay: particle.id * 0.12 }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-6xl text-center">
        <div className="relative mx-auto h-[500px] w-full max-w-5xl">
          <motion.div
            animate={{
              scale: [1, 1.02, 1],
              boxShadow: [
                "0 0 28px rgba(59,227,255,0.28), 0 24px 60px rgba(2,6,23,0.55)",
                "0 0 42px rgba(59,227,255,0.42), 0 28px 68px rgba(2,6,23,0.6)",
                "0 0 28px rgba(59,227,255,0.28), 0 24px 60px rgba(2,6,23,0.55)"
              ]
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="posturex-logo absolute left-1/2 top-1/2 z-30 grid h-40 w-40 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[28px] border border-cyan-200/30 bg-white/8 backdrop-blur-xl"
          >
            <span className="text-6xl font-semibold tracking-tight text-white">X</span>
          </motion.div>

          {ORBIT_CARDS.map((card) => (
            <OrbitingCard key={card.id} config={card} hoveredId={hoveredId} setHoveredId={setHoveredId} />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease: "easeOut" }}
          className="text-lg text-slate-100"
        >
          AI-Powered Posture Intelligence
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.05, ease: "easeOut" }}
          className="mt-7 flex flex-wrap justify-center gap-3"
        >
          <button className="rounded-xl border border-cyan-200/35 bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(59,227,255,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(59,227,255,0.5)] active:translate-y-0.5">
            Start Free
          </button>
          <button className="rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:translate-y-0.5">
            View Demo
          </button>
        </motion.div>
      </div>

      <style jsx>{`
        .posturex-logo {
          position: relative;
          overflow: hidden;
        }

        .posturex-logo::after {
          content: "";
          position: absolute;
          inset: -35%;
          width: 42%;
          transform: translateX(-210%) rotate(24deg);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
          animation: logoShimmer 6s ease-in-out infinite;
        }

        .posturex-orbit {
          animation: orbitSpin var(--orbit-duration) linear infinite;
          animation-play-state: var(--orbit-play);
          transform-origin: 50% 50%;
        }

        .posturex-arm {
          position: absolute;
          left: 50%;
          top: 50%;
          width: var(--orbit-radius);
          transform: translate(-50%, -50%) rotate(var(--orbit-angle));
          transform-origin: left center;
        }

        .posturex-connector {
          position: absolute;
          left: 0;
          top: 50%;
          height: 1px;
          width: 100%;
          transform: translateY(-50%);
          background: linear-gradient(90deg, rgba(59, 227, 255, 0.55), rgba(59, 227, 255, 0.08));
          box-shadow: 0 0 12px rgba(59, 227, 255, 0.3);
          overflow: hidden;
        }

        .posturex-connector-dot {
          position: absolute;
          top: -1px;
          left: 0;
          width: 24px;
          height: 3px;
          border-radius: 9999px;
          background: rgba(59, 227, 255, 0.9);
          box-shadow: 0 0 14px rgba(59, 227, 255, 0.75);
        }

        .posturex-card {
          position: absolute;
          right: -8px;
          top: 50%;
          transform: translateY(-50%);
          transform-origin: center;
          box-shadow: 0 18px 54px rgba(2, 6, 23, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .posturex-sweep {
          pointer-events: none;
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: inherit;
        }

        .posturex-sweep::after {
          content: "";
          position: absolute;
          inset: -30%;
          width: 35%;
          transform: translateX(-260%) rotate(22deg);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
          animation: cardSweep 6s ease-in-out infinite;
        }

        @keyframes orbitSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes logoShimmer {
          0% {
            transform: translateX(-210%) rotate(24deg);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          36% {
            transform: translateX(380%) rotate(24deg);
            opacity: 0;
          }
          100% {
            transform: translateX(380%) rotate(24deg);
            opacity: 0;
          }
        }

        @keyframes cardSweep {
          0% {
            transform: translateX(-260%) rotate(22deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          35% {
            transform: translateX(380%) rotate(22deg);
            opacity: 0;
          }
          100% {
            transform: translateX(380%) rotate(22deg);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}

export default PostureXHero;
