"use client";

import { useEffect, useRef } from "react";

const STOPS = [
  { at: 0, rgb: [125, 211, 252] },
  { at: 0.5, rgb: [216, 180, 254] },
  { at: 1, rgb: [253, 186, 116] },
];

function mixColor(t: number, alpha: number) {
  const clamped = Math.min(1, Math.max(0, t));
  const next = STOPS.findIndex((stop) => stop.at >= clamped);
  const end = STOPS[Math.max(0, next)] ?? STOPS[STOPS.length - 1];
  const start = STOPS[Math.max(0, next - 1)] ?? end;
  if (!start || !end) return `rgba(255, 255, 255, ${alpha})`;
  const span = end.at - start.at || 1;
  const mix = start === end ? 0 : (clamped - start.at) / span;
  const channel = (index: number) =>
    Math.round((start.rgb[index] ?? 0) + ((end.rgb[index] ?? 0) - (start.rgb[index] ?? 0)) * mix);
  return `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${alpha})`;
}

function sweepSeconds(tokens: number) {
  return Math.max(14, 22 - Math.max(0, tokens) * 0.04);
}

export function HeartbeatBackdrop({ tokens }: { tokens: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 1;
    let height = 1;
    let elapsed = 0;
    let last = performance.now();
    let frame = 0;
    let stopped = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(canvas.clientWidth));
      height = Math.max(1, Math.floor(canvas.clientHeight));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (progress: number) => {
      context.clearRect(0, 0, width, height);
      const mid = height * 0.5;
      const band = Math.min(220, height * 0.28);

      const wash = context.createLinearGradient(0, mid, width, mid);
      wash.addColorStop(0, mixColor(0, 0));
      wash.addColorStop(0.18, mixColor(0.15, 0.22));
      wash.addColorStop(0.5, mixColor(0.5, 0.3));
      wash.addColorStop(0.82, mixColor(0.85, 0.22));
      wash.addColorStop(1, mixColor(1, 0));
      context.fillStyle = wash;
      context.fillRect(0, mid - band, width, band * 2);

      const fade = context.createLinearGradient(0, mid - band, 0, mid + band);
      fade.addColorStop(0, "rgba(9, 9, 11, 1)");
      fade.addColorStop(0.42, "rgba(9, 9, 11, 0)");
      fade.addColorStop(0.58, "rgba(9, 9, 11, 0)");
      fade.addColorStop(1, "rgba(9, 9, 11, 1)");
      context.fillStyle = fade;
      context.fillRect(0, mid - band, width, band * 2);

      const x = progress * (width + band) - band * 0.5;
      const glow = context.createRadialGradient(x, mid, 0, x, mid, band);
      glow.addColorStop(0, mixColor(progress, 0.55));
      glow.addColorStop(0.4, mixColor(progress, 0.22));
      glow.addColorStop(1, mixColor(progress, 0));
      context.fillStyle = glow;
      context.fillRect(x - band, mid - band, band * 2, band * 2);

      const trail = context.createLinearGradient(Math.max(0, x - band * 1.8), mid, x, mid);
      trail.addColorStop(0, mixColor(Math.max(0, progress - 0.2), 0));
      trail.addColorStop(1, mixColor(progress, 0.34));
      context.fillStyle = trail;
      context.beginPath();
      context.ellipse(x - band * 0.7, mid, band * 0.9, band * 0.38, 0, 0, Math.PI * 2);
      context.fill();
    };

    resize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new ResizeObserver(() => {
      resize();
      paint(0.45);
    });
    observer.observe(canvas);

    if (reduced) {
      paint(0.45);
    } else {
      const loop = (now: number) => {
        if (stopped) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        elapsed += dt;
        const duration = sweepSeconds(tokensRef.current);
        paint((elapsed % duration) / duration);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
