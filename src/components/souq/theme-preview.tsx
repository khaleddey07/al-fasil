"use client";

import { memo } from "react";
import { Store, Truck, BadgeCheck, ShoppingBag } from "lucide-react";
import { getLuxTheme, LUX_CATEGORY_LABELS } from "@/lib/lux-themes";
import type { LuxTheme } from "@/lib/lux-themes";
import { cn } from "@/lib/utils";

/**
 * محاكاة مصغّرة حيّة لواجهة المتجر بقالب Lux محدد
 * تُستخدم في معرض القوالب، الكاروسيل بالصفحة الرئيسية، ونافذة المعاينة
 */
export const ThemePreview = memo(function ThemePreview({
  themeId,
  storeName = "متجر النور",
  className,
  compact = false,
}: {
  themeId: string;
  storeName?: string;
  className?: string;
  compact?: boolean;
}) {
  const t: LuxTheme = getLuxTheme(themeId);
  const s = t.styles;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl select-none pointer-events-none",
        className
      )}
      style={{ background: s.bodyBg }}
      dir="rtl"
      aria-hidden
    >
      {/* ترويسة المتجر */}
      <div
        className="relative px-3 pb-5 pt-2.5 overflow-hidden"
        style={{ background: s.heroBg }}
      >
        {s.pattern === "dots" && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
              backgroundSize: "10px 10px",
            }}
          />
        )}
        {s.pattern === "grid" && (
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
        )}
        <div
          className="absolute -top-6 -left-5 w-20 h-20 rounded-full blur-xl"
          style={{ background: s.glow1 }}
        />
        <div
          className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full blur-xl"
          style={{ background: s.glow2 }}
        />

        <div className="relative flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
            style={{
              background: s.badgeBg,
              borderColor: s.badgeBorder,
            }}
          >
            <Store className="w-3.5 h-3.5" style={{ color: s.heroText }} />
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "font-bold truncate leading-tight",
                s.fontClass,
                compact ? "text-[9px]" : "text-[11px]"
              )}
              style={{ color: s.heroText }}
            >
              {storeName}
            </p>
            {!compact && (
              <div className="flex gap-1 mt-1">
                <span
                  className="rounded-full px-1.5 py-px text-[6.5px] font-semibold border flex items-center gap-0.5"
                  style={{
                    background: s.badgeBg,
                    borderColor: s.badgeBorder,
                    color: s.badgeText,
                  }}
                >
                  <BadgeCheck className="w-2 h-2" style={{ color: s.accent }} />
                  موثوق
                </span>
                <span
                  className="rounded-full px-1.5 py-px text-[6.5px] font-semibold border flex items-center gap-0.5"
                  style={{
                    background: s.badgeBg,
                    borderColor: s.badgeBorder,
                    color: s.badgeText,
                  }}
                >
                  <Truck className="w-2 h-2" style={{ color: s.accent }} />
                  58 ولاية
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* شبكة المنتجات */}
      <div className={cn("grid grid-cols-3", compact ? "gap-1 p-1.5" : "gap-1.5 p-2")}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden border"
            style={{ background: s.cardBg, borderColor: s.border }}
          >
            <div
              className={cn("w-full", compact ? "h-6" : "h-9")}
              style={{
                background: `linear-gradient(135deg, ${s.accent}26 0%, ${s.accent}0d 100%)`,
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag
                  className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"}
                  style={{ color: s.accent, opacity: 0.55 }}
                />
              </div>
            </div>
            <div className={cn("space-y-1", compact ? "p-1" : "p-1.5")}>
              <div
                className="h-1 rounded-full w-4/5"
                style={{ background: s.cardText, opacity: 0.28 }}
              />
              <div className="flex items-center justify-between">
                <div
                  className="h-1.5 rounded-full w-2/5"
                  style={{ background: s.priceColor, opacity: 0.85 }}
                />
                <div
                  className={cn("rounded-full", compact ? "h-1.5 w-2.5" : "h-2 w-3.5")}
                  style={{ background: s.buttonBg }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* شريط سفلي */}
      <div
        className="text-center py-1"
        style={{ background: s.footerBg }}
      >
        <span
          className={cn("font-semibold tracking-wide", compact ? "text-[5.5px]" : "text-[7px]")}
          style={{ color: s.footerText }}
        >
          مدعوم بواسطة سوقي
        </span>
      </div>
    </div>
  );
});

/** شارة اسم القالب + القطاع (تحت كل معاينة) */
export function ThemeMeta({
  theme,
  compact = false,
}: {
  theme: LuxTheme;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 min-w-0", compact && "gap-1")}>
      <span className="text-sm shrink-0" aria-hidden>
        {theme.icon}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-bold truncate",
            theme.styles.fontClass,
            compact ? "text-[10px]" : "text-sm"
          )}
        >
          {theme.nameAr}
        </p>
        {!compact && (
          <p className="text-[10px] text-muted-foreground truncate">
            {theme.nameFr} · {LUX_CATEGORY_LABELS[theme.category]}
          </p>
        )}
      </div>
    </div>
  );
}
