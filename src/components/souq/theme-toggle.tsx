"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface ThemeToggleProps {
  /** onGradient: فوق التدرج الزمردي الخلفي — بزجاجية فاتحة
   *  floating: عائم بخلفية زمردية صلبة مقروءة فوق أي خلفية */
  variant?: "default" | "onGradient" | "floating";
}

/**
 * مفتاح التبديل بين الوضع الفاتح والداكن (متطلب الوثيقة:
 * دعم كامل للوضع الداكن). يتذكر اختيار المستخدم ويحترم
 * تفضيل النظام افتراضيًا، مع اهتزاز خفيف عند الضغط.
 */
export function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // لمنع اختلاف الترطيب (hydration mismatch) بين الخادم والمتصفح
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const onGradient = variant === "onGradient";
  const floating = variant === "floating";

  return (
    <button
      type="button"
      aria-label={isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      onClick={() => {
        haptic(30);
        setTheme(isDark ? "light" : "dark");
      }}
      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border transition-all duration-300 hover:scale-105 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        floating
          ? "bg-primary/90 border-white/25 text-primary-foreground backdrop-blur-md shadow-lift hover:bg-primary"
          : onGradient
            ? "bg-white/12 border-white/20 text-white backdrop-blur-md hover:bg-white/22"
            : "bg-card border-border text-foreground hover:bg-accent hover:border-primary/30 shadow-sm"
      }`}
    >
      {!mounted ? (
        <span className="w-4.5 h-4.5 block opacity-0" aria-hidden="true" />
      ) : isDark ? (
        <Sun className="w-4.5 h-4.5" />
      ) : (
        <Moon className="w-4.5 h-4.5" />
      )}
    </button>
  );
}
