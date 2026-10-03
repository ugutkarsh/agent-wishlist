"use client";

import { useEffect, useRef } from "react";

const TRACES = [{ baseline: 0.5, alpha: 1, phase: 0 }];

function buildTemplate() {
  const samples: number[] = [];
  const line = (count: number, y: number) => {
    for (let i = 0; i < count; i += 1) samples.push(y);
  };
  const wave = (count: number, height: number) => {
    for (let i = 0; i < count; i += 1) {
      samples.push(-Math.sin((Math.PI * i) / Math.max(1, count - 1)) * height);
    }
  };

  line(6, 0);
  wave(10, 12);
  line(6, 0);
  samples.push(6, 12);
  samples.push(-30, -78, -92, -36);
  samples.push(24, 10, 2);
  line(5, 0);
  wave(14, 18);
  line(5, 0);
  return samples;
}

const TEMPLATE = buildTemplate();

function monitorRate(tokens: number) {
  const safe = Math.max(0, tokens);
  return {
    bpm: Math.min(84, 36 + safe * 0.45),
    sweepSeconds: Math.max(12, 18 - safe * 0.03),
  };
}

function dotColor(t: number) {
  const stops = [
    { at: 0, rgb: [103, 232, 249] },
    { at: 0.48, rgb: [232, 121, 249] },
    { at: 1, rgb: [253, 186, 116] },
  ];
  const next = stops.findIndex((stop) => stop.at >= t);
  const end = stops[Math.max(0, next)];
  const start = stops[Math.max(0, next - 1)] ?? end;
  if (!start || !end || start === end) {
    const [r, g, b] = end?.rgb ?? [255, 255, 255];
    return `rgb(${r}, ${g}, ${b})`;
  }
  const span = end.at - start.at || 1;
  const mix = (t - start.at) / span;
  const channel = (index: number) =>
    Math.round((start.rgb[index] ?? 0) + ((end.rgb[index] ?? 0) - (start.rgb[index] ?? 0)) * mix);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function sampleAt(phase: number, period: number, paper: number) {
  const natural = TEMPLATE.length / paper;
  const window = Math.min(natural, period * 0.82);
  if (phase >= window) return 0;
  const index = Math.min(
    TEMPLATE.length - 1,
    Math.floor((phase / window) * TEMPLATE.length),
  );
  return TEMPLATE[index] ?? 0;
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
    let buffers: (number | null)[][] = TRACES.map(() => []);
    let head = 0;
    let dotX = 0;
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
      prefill();
    };

    const prefill = () => {
      const { bpm, sweepSeconds } = monitorRate(tokensRef.current);
      const paper = width / sweepSeconds;
      const period = 60 / bpm;
      const gap = Math.round(Math.min(64, width * 0.04));
      buffers = TRACES.map(() => Array<number | null>(width).fill(0));
      for (let x = 0; x < width; x += 1) {
        const time = x / paper;
        TRACES.forEach((trace, index) => {
          const buffer = buffers[index];
          if (!buffer) return;
          buffer[x] =
            x < gap
              ? null
              : sampleAt((time + trace.phase * period) % period, period, paper);
        });
      }
      head = 0;
      elapsed = 0;
    };

    const paint = () => {
      context.clearRect(0, 0, width, height);
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#67e8f9");
      gradient.addColorStop(0.48, "#e879f9");
      gradient.addColorStop(1, "#fdba74");
      context.lineJoin = "round";
      context.lineCap = "round";
      context.strokeStyle = gradient;
      context.shadowBlur = 14;
      context.shadowColor = "rgba(232, 121, 249, 0.8)";

      TRACES.forEach((trace, index) => {
        const buffer = buffers[index];
        if (!buffer) return;
        context.beginPath();
        let drawing = false;
        const baseline = height * trace.baseline;
        for (let x = 0; x < width; x += 1) {
          const sample = buffer[x];
          if (sample == null) {
            drawing = false;
            continue;
          }
          const y = baseline + sample;
          if (!drawing) {
            context.moveTo(x, y);
            drawing = true;
          } else {
            context.lineTo(x, y);
          }
        }
        context.lineWidth = 8;
        context.globalAlpha = trace.alpha * 0.28;
        context.stroke();
        context.lineWidth = 2.2;
        context.globalAlpha = trace.alpha;
        context.stroke();
      });

      const trace = TRACES[0];
      const buffer = buffers[0];
      const sample = buffer?.[dotX];
      if (trace && sample != null) {
        const y = height * trace.baseline + sample;
        const color = dotColor(dotX / Math.max(1, width));
        context.globalAlpha = 0.45;
        context.fillStyle = color;
        context.shadowBlur = 22;
        context.shadowColor = color;
        context.beginPath();
        context.arc(dotX, y, 11, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
        context.fillStyle = "#fff";
        context.shadowBlur = 16;
        context.beginPath();
        context.arc(dotX, y, 4.5, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;
    };

    const write = (dt: number) => {
      const { bpm, sweepSeconds } = monitorRate(tokensRef.current);
      const paper = width / sweepSeconds;
      const period = 60 / bpm;
      const steps = Math.min(width, Math.max(1, Math.round(paper * dt)));
      const stepDt = dt / steps;
      const gap = Math.round(Math.min(64, width * 0.04));

      for (let step = 0; step < steps; step += 1) {
        elapsed += stepDt;
        const x = head;
        TRACES.forEach((trace, index) => {
          const buffer = buffers[index];
          if (!buffer) return;
          const phase = (elapsed + trace.phase * period) % period;
          buffer[x] = sampleAt(phase, period, paper);
        });
        dotX = x;
        for (let ahead = 1; ahead <= gap; ahead += 1) {
          const gapX = (x + ahead) % width;
          for (const buffer of buffers) {
            if (buffer) buffer[gapX] = null;
          }
        }
        head = (head + 1) % width;
      }
    };

    resize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new ResizeObserver(() => {
      resize();
      paint();
    });
    observer.observe(canvas);

    if (!reduced) {
      const loop = (now: number) => {
        if (stopped) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        write(dt);
        paint();
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    } else {
      paint();
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_18%,rgba(34,211,238,0.14),transparent_42%),radial-gradient(ellipse_at_70%_30%,rgba(217,70,239,0.16),transparent_36%),radial-gradient(ellipse_at_88%_24%,rgba(251,146,60,0.14),transparent_40%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
