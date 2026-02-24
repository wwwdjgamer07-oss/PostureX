"use client";

import { useEffect } from "react";

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
      canvas.width = width;
      canvas.height = height;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef, canvasRef]);
}
