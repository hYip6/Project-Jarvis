"use client";

import { useEffect, useRef } from "react";

type Ripple = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
};

const POOL = "#081B29";
const RIPPLE_SPEED = 1.65;
const OPACITY_DECAY = 0.0065;
const LINE_WIDTH = 1.75;
const MAX_RIPPLES = 48;
const DRIP_MIN_MS = 800;
const DRIP_MAX_MS = 1500;

function randomDripDelay(): number {
  return DRIP_MIN_MS + Math.random() * (DRIP_MAX_MS - DRIP_MIN_MS);
}

export function WaterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const rafIdRef = useRef(0);
  const lastTimeRef = useRef(0);
  const cancelledRef = useRef(false);
  const dripTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const surface = canvasRef.current;
    if (!surface) return;
    const ctx = surface.getContext("2d");
    if (!ctx) return;
    contextRef.current = ctx;

    cancelledRef.current = false;
    ripplesRef.current = [];
    lastTimeRef.current = 0;

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);

    function resize() {
      const node = canvasRef.current;
      if (!node) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      node.width = Math.floor(w * dpr);
      node.height = Math.floor(h * dpr);
      node.style.width = `${w}px`;
      node.style.height = `${h}px`;
      const c = contextRef.current;
      if (c) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    resize();
    window.addEventListener("resize", resize);

    function maxRadius(): number {
      return Math.max(window.innerWidth, window.innerHeight) * 0.9;
    }

    function pushRipple(x: number, y: number, opacity: number) {
      const list = ripplesRef.current;
      if (list.length >= MAX_RIPPLES) {
        list.shift();
      }
      list.push({ x, y, radius: 1, opacity });
    }

    function onWindowClick(e: MouseEvent) {
      pushRipple(e.clientX, e.clientY, 0.92);
    }
    window.addEventListener("click", onWindowClick);

    function scheduleDrip() {
      dripTimerRef.current = setTimeout(() => {
        dripTimerRef.current = null;
        if (cancelledRef.current) return;
        pushRipple(
          Math.random() * window.innerWidth,
          Math.random() * window.innerHeight,
          0.28 + Math.random() * 0.42
        );
        scheduleDrip();
      }, randomDripDelay());
    }
    scheduleDrip();

    function frame(now: number) {
      const c = contextRef.current;
      if (!c) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const prev = lastTimeRef.current || now;
      const dt = Math.min((now - prev) / 16.67, 3);
      lastTimeRef.current = now;

      c.globalCompositeOperation = "source-over";
      c.fillStyle = POOL;
      c.fillRect(0, 0, w, h);

      c.lineWidth = LINE_WIDTH;
      c.globalCompositeOperation = "screen";

      const ripples = ripplesRef.current;
      const capR = maxRadius();

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]!;
        r.radius += RIPPLE_SPEED * dt;
        r.opacity -= OPACITY_DECAY * dt;
        if (r.opacity <= 0 || r.radius > capR) {
          ripples.splice(i, 1);
          continue;
        }
        c.beginPath();
        c.strokeStyle = `rgba(14, 165, 233, ${r.opacity})`;
        c.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        c.stroke();
      }

      rafIdRef.current = requestAnimationFrame(frame);
    }

    rafIdRef.current = requestAnimationFrame(frame);

    return () => {
      contextRef.current = null;
      cancelledRef.current = true;
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", onWindowClick);
      if (dripTimerRef.current != null) {
        clearTimeout(dripTimerRef.current);
        dripTimerRef.current = null;
      }
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[-1] h-full w-full"
      aria-hidden
    />
  );
}
