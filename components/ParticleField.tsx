"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  depth: number;
  blur: number;
  color: string;
}

const colors = [
  "rgba(0,229,255,0.9)",
  "rgba(41,98,255,0.85)",
  "rgba(255,255,255,0.8)"
];

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: random(0, 100),
    y: random(0, 100),
    size: random(2, 7),
    opacity: random(0.1, 0.4),
    driftX: random(-24, 24),
    driftY: random(-24, 24),
    duration: random(18, 44),
    delay: random(0, 8),
    depth: random(0.1, 0.42),
    blur: random(1, 4),
    color: colors[Math.floor(random(0, colors.length))]
  }));
}

export function ParticleField() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particles = useMemo(() => {
    if (typeof window === "undefined") return createParticles(56);
    const count = Math.max(40, Math.min(80, Math.floor(window.innerWidth / 24)));
    return createParticles(count);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let frame = 0;
    let mouseX = 0;
    let mouseY = 0;

    const updateParallax = () => {
      frame = 0;
      element.style.setProperty("--ambient-mx", `${mouseX.toFixed(2)}px`);
      element.style.setProperty("--ambient-my", `${mouseY.toFixed(2)}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      const centeredX = (event.clientX / window.innerWidth - 0.5) * 10;
      const centeredY = (event.clientY / window.innerHeight - 0.5) * 10;
      mouseX = centeredX;
      mouseY = centeredY;
      if (!frame) {
        frame = window.requestAnimationFrame(updateParallax);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="ambient-particle-wrap absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            ["--p-depth" as string]: particle.depth
          }}
        >
          <span
            className="ambient-particle block rounded-full"
            style={
              {
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                opacity: particle.opacity,
                filter: `blur(${particle.blur}px)`,
                background: particle.color,
                ["--drift-x" as string]: `${particle.driftX}px`,
                ["--drift-y" as string]: `${particle.driftY}px`,
                ["--ambient-duration" as string]: `${particle.duration}s`,
                ["--ambient-delay" as string]: `${particle.delay}s`
              } as CSSProperties
            }
          />
        </div>
      ))}
    </div>
  );
}
