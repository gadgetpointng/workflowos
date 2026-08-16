"use client";

import { useEffect, useRef, type CSSProperties } from "react";

interface KineticGridProps {
  background?: string;
  dotColor?: string;
  lineColor?: string;
  trailColor?: string;
  spacing?: number;
  radius?: number;
  strength?: number;
  trail?: boolean;
  style?: CSSProperties;
}

export default function KineticGrid({
  background = "#102a43",
  dotColor = "#ffffff",
  lineColor = "#80acff",
  trailColor = "#2664eb",
  spacing = 30,
  radius = 400,
  strength = 4,
  trail = true,
  style,
}: KineticGridProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const trailRef = useRef<{ x: number; y: number; t: number }[]>([]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gap = Math.max(8, spacing);
    const attractionRadius = Math.max(1, radius);
    const pull = (Math.max(1, Math.min(10, strength)) / 10) * 4;
    let width = 1;
    let height = 1;
    type Dot = { hx: number; hy: number; x: number; y: number; vx: number; vy: number };
    let cols: Dot[][] = [];
    let dots: Dot[] = [];

    const build = (measuredWidth?: number, measuredHeight?: number) => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.floor(measuredWidth ?? rect.width));
      height = Math.max(1, Math.floor(measuredHeight ?? rect.height));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = [];
      dots = [];
      const nCols = Math.floor(width / gap) + 2;
      const nRows = Math.floor(height / gap) + 2;
      for (let c = 0; c < nCols; c += 1) {
        const col: Dot[] = [];
        for (let r = 0; r < nRows; r += 1) {
          const hx = c * gap;
          const hy = r * gap;
          const dot = { hx, hy, x: hx, y: hy, vx: 0, vy: 0 };
          col.push(dot);
          dots.push(dot);
        }
        cols.push(col);
      }
    };

    build();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      build(rect?.width, rect?.height);
    }) : null;
    observer?.observe(host);

    const setMouse = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      mouseRef.current = { x, y, active: true };
      const points = trailRef.current;
      points.push({ x, y, t: performance.now() });
      if (points.length > 80) points.shift();
    };
    const onMove = (event: MouseEvent) => setMouse(event.clientX, event.clientY);
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999, active: false }; };
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) setMouse(touch.clientX, touch.clientY);
    };
    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);
    host.addEventListener("touchmove", onTouch, { passive: true });
    host.addEventListener("touchend", onLeave);

    let raf = 0;
    const frame = () => {
      const mouse = mouseRef.current;
      ctx.clearRect(0, 0, width, height);
      for (const dot of dots) {
        let ax = (dot.hx - dot.x) * 0.08;
        let ay = (dot.hy - dot.y) * 0.08;
        if (mouse.active) {
          const dx = mouse.x - dot.x;
          const dy = mouse.y - dot.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < attractionRadius && distance > 0.001) {
            const force = (1 - distance / attractionRadius) * pull;
            ax += (dx / distance) * force;
            ay += (dy / distance) * force;
          }
        }
        dot.vx = (dot.vx + ax) * 0.82;
        dot.vy = (dot.vy + ay) * 0.82;
        dot.x += dot.vx;
        dot.y += dot.vy;
      }
      for (let c = 0; c < cols.length; c += 1) {
        for (let r = 0; r < cols[c].length; r += 1) {
          const dot = cols[c][r];
          const right = cols[c + 1]?.[r];
          const down = cols[c]?.[r + 1];
          const proximity = mouse.active ? Math.max(0, 1 - Math.sqrt((mouse.x - dot.x) ** 2 + (mouse.y - dot.y) ** 2) / attractionRadius) : 0;
          ctx.globalAlpha = 0.06 + proximity * 0.7;
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 0.5 + proximity * 1.5;
          if (right) { ctx.beginPath(); ctx.moveTo(dot.x, dot.y); ctx.lineTo(right.x, right.y); ctx.stroke(); }
          if (down) { ctx.beginPath(); ctx.moveTo(dot.x, dot.y); ctx.lineTo(down.x, down.y); ctx.stroke(); }
        }
      }
      for (const dot of dots) {
        const proximity = mouse.active ? Math.max(0, 1 - Math.sqrt((mouse.x - dot.x) ** 2 + (mouse.y - dot.y) ** 2) / attractionRadius) : 0;
        ctx.globalAlpha = 0.22 + proximity * 0.78;
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 0.8 + proximity * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (trail) {
        const now = performance.now();
        const points = trailRef.current;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 1; i < points.length; i += 1) {
          const a = points[i - 1];
          const b = points[i];
          const age = now - b.t;
          if (age > 260) continue;
          ctx.globalAlpha = Math.max(0, 1 - age / 260) * 0.85;
          ctx.strokeStyle = trailColor;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
      host.removeEventListener("touchmove", onTouch);
      host.removeEventListener("touchend", onLeave);
    };
  }, [dotColor, lineColor, trailColor, spacing, radius, strength, trail]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", background, ...style }}><canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} /></div>;
}
