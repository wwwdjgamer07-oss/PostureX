"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

interface CrowFlight {
  id: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  curve: number;
  size: number;
  durationMs: number;
  opacity: number;
  hue: "cyan" | "white" | "blue";
}

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pickFlight(id: number, width: number, height: number, lightMode: boolean): CrowFlight {
  const edge = Math.floor(random(0, 4));
  const margin = 40;
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  if (edge === 0) {
    startX = -margin;
    startY = random(40, height - 80);
    endX = width + margin;
    endY = startY + random(-120, 120);
  } else if (edge === 1) {
    startX = width + margin;
    startY = random(40, height - 80);
    endX = -margin;
    endY = startY + random(-120, 120);
  } else if (edge === 2) {
    startX = random(40, width - 80);
    startY = -margin;
    endX = startX + random(-180, 180);
    endY = height + margin;
  } else {
    startX = random(40, width - 80);
    startY = height + margin;
    endX = startX + random(-180, 180);
    endY = -margin;
  }

  return {
    id,
    startX,
    startY,
    dx: endX - startX,
    dy: endY - startY,
    curve: random(-56, 56),
    size: lightMode ? random(20, 44) : random(14, 30),
    durationMs: random(17000, 26000),
    opacity: lightMode ? random(0.58, 0.86) : random(0.34, 0.62),
    hue: lightMode ? (Math.random() > 0.5 ? "cyan" : "blue") : (Math.random() > 0.28 ? "cyan" : "white")
  };
}

function CrowShape({ hue }: { hue: "cyan" | "white" | "blue" }) {
  const tone =
    hue === "cyan" ? "rgba(10,68,84,0.98)" :
    hue === "blue" ? "rgba(20,46,122,0.98)" :
    "rgba(70,82,108,0.95)";
  const edge = "rgba(5, 12, 28, 0.45)";
  return (
    <svg viewBox="0 0 64 32" className="ambient-crow-svg">
      <g className="ambient-crow-wing ambient-crow-wing-left" transform-origin="22px 16px">
        <path d="M28 16 C20 6, 10 4, 2 7 C10 12, 20 14, 28 16 Z" fill={tone} stroke={edge} strokeWidth="0.9" />
      </g>
      <g className="ambient-crow-wing ambient-crow-wing-right" transform-origin="42px 16px">
        <path d="M36 16 C44 6, 54 4, 62 7 C54 12, 44 14, 36 16 Z" fill={tone} stroke={edge} strokeWidth="0.9" />
      </g>
      <ellipse cx="32" cy="18" rx="8" ry="4.2" fill={tone} stroke={edge} strokeWidth="0.8" />
    </svg>
  );
}

interface FlyingCrowsProps {
  lightMode?: boolean;
}

export function FlyingCrows({ lightMode = false }: FlyingCrowsProps) {
  const [viewport, setViewport] = useState({ width: 1400, height: 900 });
  const [flights, setFlights] = useState<CrowFlight[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timeouts = new Set<number>();

    const removeFlight = (id: number) => {
      setFlights((current) => current.filter((item) => item.id !== id));
    };

    const scheduleSpawn = () => {
      const nextDelay = Math.floor(random(3000, 5000));
      const spawnTimer = window.setTimeout(() => {
        if (!active) return;
        setFlights((current) => {
          if (current.length >= 4) return current;
          const id = idRef.current + 1;
          idRef.current = id;
          const next = pickFlight(id, viewport.width, viewport.height, lightMode);
          const removeTimer = window.setTimeout(() => removeFlight(id), next.durationMs + 400);
          timeouts.add(removeTimer);
          return [...current, next];
        });
        scheduleSpawn();
      }, nextDelay);
      timeouts.add(spawnTimer);
    };

    scheduleSpawn();

    return () => {
      active = false;
      for (const timer of timeouts) {
        window.clearTimeout(timer);
      }
      timeouts.clear();
    };
  }, [lightMode, viewport.height, viewport.width]);

  return (
    <div className="absolute inset-0">
      {flights.map((flight) => (
        <div
          key={flight.id}
          className="ambient-crow-start absolute"
          style={
            {
              left: `${flight.startX}px`,
              top: `${flight.startY}px`,
              opacity: flight.opacity
            } as CSSProperties
          }
        >
          <div
            className="ambient-crow-x"
            style={
              {
                ["--crow-dx" as string]: `${flight.dx}px`,
                ["--crow-duration" as string]: `${flight.durationMs}ms`
              } as CSSProperties
            }
          >
            <div
              className="ambient-crow-y"
              style={
                {
                  ["--crow-dy" as string]: `${flight.dy}px`,
                  ["--crow-curve" as string]: `${flight.curve}px`,
                  ["--crow-duration" as string]: `${flight.durationMs}ms`
                } as CSSProperties
              }
            >
              <div className="ambient-crow-body" style={{ width: `${flight.size}px`, height: `${Math.round(flight.size * 0.52)}px` }}>
                <CrowShape hue={flight.hue} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
