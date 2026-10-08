"use client";

import { useEffect, useRef } from "react";
import { ThemePreview } from "./theme-preview";
import { LUX_THEMES, LUX_CATEGORY_LABELS } from "@/lib/lux-themes";
import type { LuxTheme } from "@/lib/lux-themes";
import { cn } from "@/lib/utils";

/**
 * كاروسيل دوّار لقوالب Lux العشرين — زجاجي ثلاثي الأبعاد مع تقدّم تلقائي
 */
export function TemplateCarousel() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    // احترام تقليل الحركة
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const track = trackRef.current;
    if (!track) return;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      const cards = Array.from(track.children) as HTMLElement[];
      if (cards.length === 0) return;

      // البطاقة الأقرب لمركز الشريط
      const centerX = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let nearestDist = Infinity;
      cards.forEach((card, i) => {
        const c = card.offsetLeft + card.offsetWidth / 2;
        const d = Math.abs(c - centerX);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = i;
        }
      });

      const next = (nearest + 1) % cards.length;
      const target = cards[next];
      track.scrollTo({
        left: target.offsetLeft - track.clientWidth / 2 + target.offsetWidth / 2,
        behavior: "smooth",
      });
    }, 3200);

    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onTouchStart={() => (pausedRef.current = true)}
    >
      {/* تدرجات جانبية للاندماج مع الخلفية */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0B0B12] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0B0B12] to-transparent z-10" />

      <div
        ref={trackRef}
        className="scroll-snap-x flex gap-5 overflow-x-auto px-[22%] py-6"
        style={{ perspective: "1100px" }}
        aria-label="معرض قوالب التصميم الفاخرة"
      >
        {LUX_THEMES.map((t, i) => (
          <CarouselCard key={t.id} theme={t} index={i} />
        ))}
      </div>
    </div>
  );
}

function CarouselCard({ theme, index }: { theme: LuxTheme; index: number }) {
  return (
    <div
      className="shrink-0 w-44 sm:w-52 transition-transform duration-500"
      style={{
        transform: "rotateY(0deg)",
        animationDelay: `${index * 0.08}s`,
      }}
    >
      <div
        className={cn(
          "rounded-2xl p-1.5 bg-white/[0.05] border backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 cursor-pointer",
          index % 3 === 0 ? "border-gold/30" : "border-white/10"
        )}
      >
        <ThemePreview themeId={theme.id} className="rounded-xl border border-white/10" compact />
        <div className="flex items-center gap-1.5 px-2 pt-2 pb-1.5">
          <span aria-hidden className="text-xs shrink-0">
            {theme.icon}
          </span>
          <div className="min-w-0">
            <p className={cn("text-[11px] font-bold text-white truncate", theme.styles.fontClass)}>
              {theme.nameAr}
            </p>
            <p className="text-[8.5px] text-white/45 truncate">
              {LUX_CATEGORY_LABELS[theme.category]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
