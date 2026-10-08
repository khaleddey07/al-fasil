"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
  speed: number;
}

/**
 * جزيئات ذهبية متحركة — خلفية "Dark Cosmos" للواجهة الرئيسية
 * Canvas خفيف: ~50 جزيء، يتوقف تلقائيًا عند تفعيل تقليل الحركة
 */
export function GoldParticles({
  density = 50,
  className,
}: {
  density?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // احترام تفضيل تقليل الحركة
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let raf = 0;
    let particles: Particle[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(
        18,
        Math.min(density, Math.floor((rect.width * rect.height) / 22000))
      );
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        r: 0.8 + Math.random() * 1.9,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.05 - Math.random() * 0.22,
        alpha: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.2,
      }));
    }

    let t = 0;
    function frame() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      t += 0.016;

      for (const p of particles) {
        p.x += p.vx + Math.sin(t * p.speed + p.phase) * 0.08;
        p.y += p.vy;

        // الالتفاف عند الحدود
        if (p.y < -6) {
          p.y = rect.height + 6;
          p.x = Math.random() * rect.width;
        }
        if (p.x < -6) p.x = rect.width + 6;
        if (p.x > rect.width + 6) p.x = -6;

        // وميض ذهبي
        const twinkle = 0.65 + Math.sin(t * p.speed * 2 + p.phase) * 0.35;
        const a = p.alpha * twinkle;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `rgba(255, 223, 130, ${a})`);
        grad.addColorStop(0.4, `rgba(212, 175, 55, ${a * 0.55})`);
        grad.addColorStop(1, "rgba(212, 175, 55, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    frame();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden
    />
  );
}
