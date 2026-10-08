"use client";

import { useState, useEffect } from "react";
import { Flame } from "lucide-react";

interface UrgencyBannerProps {
  stockLeft?: number;
  initialMinutes?: number;
  /** مفتاح فريد للمتجر للحفاظ على العد التنازلي عند إعادة التحميل */
  storageKey: string;
}

/**
 * عداد العجلة والعد التنازلي (Urgency & Scarcity Timers)
 * شريط زجاجي فاخر أعلى صفحة الهبوط: كمية محدودة + عد تنازلي.
 * العد يبقى ثابتًا حتى لو أعد الزبون تحميل الصفحة (يُحفظ موعد
 * الانتهاء في localStorage) — فلا يفقد تأثيره بالتلاعب السهل.
 */
export const UrgencyBanner = ({
  stockLeft = 3,
  initialMinutes = 45,
  storageKey,
}: UrgencyBannerProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const KEY = `souq-urgency-deadline:${storageKey}`;
    const DURATION = initialMinutes * 60 * 1000;

    // استرجاع موعد الانتهاء أو إنشاؤه لأول زيارة
    let deadline = Number(localStorage.getItem(KEY) || 0);
    if (!deadline || deadline < Date.now()) {
      deadline = Date.now() + DURATION;
      try {
        localStorage.setItem(KEY, String(deadline));
      } catch {
        // التخزين ممتلئ/محظور — العد يبدأ من جديد كل زيارة
      }
    }

    const tick = () => {
      setTimeLeft(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [initialMinutes, storageKey]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // لا نعرض الشريط إلا بعد معرفة الوقت (تفادي وميض القيم)
  if (timeLeft === null) return null;

  return (
    <div
      className="w-full bg-gradient-to-r from-red-950 via-amber-900 to-red-950 text-amber-200 py-2 px-4 text-center text-sm font-bold border-b border-amber-500/30 flex justify-center items-center gap-3 flex-wrap"
      role="status"
      aria-live="polite"
    >
      <span className="animate-pulse bg-red-600 text-white px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1 shadow-sm">
        <Flame className="w-3 h-3" />
        الكمية محدودة جداً!
      </span>
      <span>
        متبقي{" "}
        <span className="text-white underline decoration-amber-400/70">
          {stockLeft} قطع
        </span>{" "}
        فقط في المخزون!
      </span>
      <span className="hidden sm:inline text-amber-300/80">|</span>
      <span className="hidden sm:inline">
        ينتهي العرض خلال:{" "}
        <span
          dir="ltr"
          className="font-mono text-base text-white tabular-nums drop-shadow"
        >
          {formatTime(timeLeft)}
        </span>
      </span>
    </div>
  );
};
