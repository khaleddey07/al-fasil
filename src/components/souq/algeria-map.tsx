"use client";

import { useMemo, useState } from "react";
import { WILAYAS } from "@/lib/wilayas";
import { formatDZD } from "@/lib/souq-types";
import { MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WilayaStat {
  code: number;
  count: number;
  total: number;
  newCount: number;
}

/* إحداثيات تقريبية لمراكز الولايات (خط الطول، خط العرض) */
const WILAYA_COORDS: Record<number, [number, number]> = {
  1: [-0.29, 27.87], 2: [1.33, 36.17], 3: [2.86, 33.8], 4: [7.11, 35.87],
  5: [6.17, 35.55], 6: [5.07, 36.75], 7: [5.73, 34.85], 8: [-2.22, 31.62],
  9: [2.83, 36.47], 10: [3.9, 36.37], 11: [5.52, 22.79], 12: [8.12, 35.4],
  13: [-1.82, 34.88], 14: [1.32, 35.37], 15: [4.05, 36.71], 16: [3.06, 36.75],
  17: [3.26, 34.67], 18: [5.77, 36.82], 19: [5.41, 36.19], 20: [0.15, 34.83],
  21: [6.91, 36.88], 22: [-0.63, 35.19], 23: [7.77, 36.9], 24: [7.43, 36.46],
  25: [6.61, 36.37], 26: [2.75, 36.26], 27: [0.09, 35.93], 28: [4.54, 35.7],
  29: [0.14, 35.4], 30: [5.32, 31.95], 31: [-0.64, 35.7], 32: [1.02, 33.68],
  33: [8.47, 26.5], 34: [4.76, 36.07], 35: [3.47, 36.76], 36: [8.31, 36.77],
  37: [-8.13, 27.67], 38: [1.81, 35.61], 39: [6.86, 33.37], 40: [7.14, 35.44],
  41: [7.95, 36.29], 42: [2.45, 36.59], 43: [6.26, 36.45], 44: [1.97, 36.26],
  45: [-0.31, 33.27], 46: [-1.14, 35.3], 47: [3.67, 32.49], 48: [0.55, 35.74],
  49: [0.23, 29.26], 50: [0.95, 21.33], 51: [5.06, 34.42], 52: [-2.17, 30.13],
  53: [2.47, 27.2], 54: [5.77, 19.57], 55: [6.06, 33.1], 56: [9.48, 24.55],
  57: [6.95, 33.95], 58: [2.88, 30.58],
};

/* حدود الخريطة وإسقاطها على viewBox */
const LNG_MIN = -9.2, LNG_MAX = 12.2, LAT_MIN = 19.0, LAT_MAX = 37.4;
const VW = 420, VH = 400;
const project = (lng: number, lat: number): [number, number] => [
  ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * VW,
  ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VH,
];

/* حدود الجزائر المبسطة (نقاط تقريبية بالساعة من الساحل الغربي) */
const SILHOUETTE: [number, number][] = [
  [-2.2, 35.35], [0.5, 36.1], [3.0, 36.85], [6.0, 37.05], [8.3, 36.85],
  [8.6, 36.2], [8.3, 35.2], [8.1, 34.6], [7.5, 33.9], [8.2, 33.4],
  [9.4, 32.5], [9.9, 31.6], [10.2, 30.5], [9.6, 29.8], [10.5, 29.0],
  [11.5, 27.5], [12.0, 25.5], [11.0, 24.5], [9.5, 23.8], [7.5, 23.4],
  [5.0, 22.9], [3.2, 22.0], [1.0, 21.2], [-1.2, 20.7], [-3.5, 21.8],
  [-5.5, 22.5], [-7.0, 23.5], [-8.7, 25.0], [-8.7, 27.5], [-7.6, 28.5],
  [-7.5, 30.0], [-8.9, 31.5], [-8.7, 33.5], [-7.5, 34.2], [-6.0, 34.6],
  [-4.5, 34.9], [-3.0, 35.0], [-1.5, 35.2],
];

const SILHOUETTE_PATH = SILHOUETTE.map(
  ([lng, lat], i) => {
    const [x, y] = project(lng, lat);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
).join(" ") + " Z";

/**
 * خريطة الجزائر التفاعلية — تتوهج كل ولاية حسب طلبياتها
 * والولايات ذات طلبيات جديدة تنبض باللون الذهبي
 */
export function AlgeriaMap({ data }: { data: WilayaStat[] }) {
  const [hovered, setHovered] = useState<WilayaStat | null>(null);

  const statsByCode = useMemo(() => {
    const m = new Map<number, WilayaStat>();
    for (const d of data) m.set(d.code, d);
    return m;
  }, [data]);

  const maxCount = useMemo(
    () => data.reduce((mx, d) => Math.max(mx, d.count), 0),
    [data]
  );

  const top5 = useMemo(() => data.slice(0, 5), [data]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-2.5 rounded-2xl border-2 border-dashed border-border/70">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <MapPin className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">خريطة الطلبيات ستظهر هنا</p>
        <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
          بمجرد وصول أول طلبية ستتوهج ولاية الزبون على خريطة الوطن
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
      {/* الخريطة */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full h-auto"
          role="img"
          aria-label="خريطة الجزائر مع توزيع الطلبيات"
        >
          <defs>
            <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFDF8E" />
              <stop offset="45%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* silhouette */}
          <path
            d={SILHOUETTE_PATH}
            fill="color-mix(in oklab, var(--primary) 10%, transparent)"
            stroke="color-mix(in oklab, var(--primary) 45%, transparent)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d={SILHOUETTE_PATH}
            fill="url(#dotGlow)"
            opacity="0.05"
          />

          {/* كل الولايات: نقطة صغيرة خافتة */}
          {WILAYAS.map((w) => {
            const coords = WILAYA_COORDS[w.code];
            if (!coords) return null;
            const [x, y] = project(coords[0], coords[1]);
            const stat = statsByCode.get(w.code);
            const intensity = stat && maxCount ? 0.25 + (stat.count / maxCount) * 0.75 : 0.18;
            const r = stat ? 4 + (stat.count / maxCount) * 6 : 2.4;
            const isNew = (stat?.newCount || 0) > 0;

            return (
              <g
                key={w.code}
                onMouseEnter={() => stat && setHovered(stat)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: stat ? "pointer" : "default" }}
              >
                {stat && (
                  <circle cx={x} cy={y} r={r * 2.4} fill="url(#dotGlow)" opacity={0.28 * intensity} />
                )}
                {/* نبض الطلبيات الجديدة */}
                {isNew && (
                  <circle cx={x} cy={y} r={r} fill="none" stroke="#FFC93C" strokeWidth="1.6">
                    <animate attributeName="r" values={`${r};${r * 2.6}`} dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={stat ? "#D4AF37" : "color-mix(in oklab, var(--primary) 40%, transparent)"}
                  opacity={intensity}
                  stroke={isNew ? "#FFDF8E" : "none"}
                  strokeWidth={isNew ? 1.4 : 0}
                >
                  <title>
                    {`${w.code} - ${w.nameAr}${stat ? `: ${stat.count} طلبية` : " — لا طلبيات بعد"}`}
                  </title>
                </circle>
              </g>
            );
          })}
        </svg>

        {/* معلومات الولاية المحددة */}
        <div className="absolute top-2 right-2 min-h-12 flex items-center">
          {hovered ? (
            <div className="rounded-xl glass border border-gold/30 px-3 py-2 animate-fade-in shadow-lift">
              <p className="text-xs font-bold text-foreground">
                {hovered.code} — {WILAYAS.find((w) => w.code === hovered.code)?.nameAr}
                {hovered.newCount > 0 && (
                  <span className="mr-1.5 inline-flex items-center gap-0.5 text-[10px] font-extrabold text-gold-strong">
                    <Sparkles className="w-3 h-3" />
                    {hovered.newCount} جديدة
                  </span>
                )}
              </p>
              <p className="text-[10.5px] text-muted-foreground mt-0.5">
                {hovered.count} طلبية · {formatDZD(hovered.total)}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              مرّر المؤشر على النقاط الذهبية
            </p>
          )}
        </div>
      </div>

      {/* أعلى الولايات */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold text-foreground/75">أعلى الولايات طلبًا</p>
        {top5.map((d, i) => {
          const w = WILAYAS.find((x) => x.code === d.code);
          return (
            <div
              key={d.code}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-300 cursor-pointer",
                "hover:bg-muted/70"
              )}
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0",
                  i === 0
                    ? "bg-gold-soft text-gold-foreground ring-1 ring-gold/40"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold truncate">
                    {w?.nameAr || d.code}
                    {d.newCount > 0 && (
                      <span className="mr-1.5 text-[9px] font-extrabold text-gold-strong">
                        +{d.newCount}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {d.count} طلبية
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-gold-strong to-gold transition-all duration-700"
                    style={{ width: `${maxCount ? (d.count / maxCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
