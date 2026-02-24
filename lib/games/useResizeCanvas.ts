"use client";

import { useEffect } from "react";

const CANVAS_RESOLUTION_SCALE = 0.72;

export function useResizeCanvas(
  containerRef: React.RefObject<HTMLElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>
) {
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.max(1, Math.floor(width * CANVAS_RESOLUTION_SCALE));
      canvas.height = Math.max(1, Math.floor(height * CANVAS_RESOLUTION_SCALE));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef, canvasRef]);
}
