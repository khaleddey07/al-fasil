"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemePreview } from "./theme-preview";
import { LUX_THEMES, LUX_CATEGORY_LABELS } from "@/lib/lux-themes";
import type { LuxCategory, LuxTheme } from "@/lib/lux-themes";
import { haptic } from "@/lib/haptics";
import { Check, Eye, Loader2, Palette, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ThemesViewProps {
  currentTheme: string;
  onThemeApplied: (themeId: string) => void;
}

type CatFilter = "all" | LuxCategory;

/**
 * معرض القوالب الفاخرة العشرين — يختار التاجر الهوية البصرية لمتجره
 * مع معاينة حيّة وتطبيق فوري
 */
export function ThemesView({ currentTheme, onThemeApplied }: ThemesViewProps) {
  const [cat, setCat] = useState<CatFilter>("all");
  const [search, setSearch] = useState("");
  const [applying, setApplying] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<LuxTheme | null>(null);

  const filtered = useMemo(() => {
    let list = LUX_THEMES;
    if (cat !== "all") list = list.filter((t) => t.category === cat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.nameAr.includes(q) ||
          t.nameFr.toLowerCase().includes(q) ||
          t.idealFor.includes(q)
      );
    }
    return list;
  }, [cat, search]);

  const categories: { key: CatFilter; label: string; icon: string }[] = [
    { key: "all", label: "كل القوالب", icon: "✦" },
    ...Object.entries(LUX_CATEGORY_LABELS).map(([key, label]) => ({
      key: key as CatFilter,
      label,
      icon: LUX_THEMES.find((t) => t.category === key)?.icon || "✦",
    })),
  ];

  async function applyTheme(themeId: string, nameAr: string) {
    if (themeId === currentTheme) return;
    setApplying(themeId);
    haptic(30);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ luxTheme: themeId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "فشل تطبيق القالب");
      }
      haptic([50, 50, 50]);
      onThemeApplied(themeId);
      toast({
        title: `تم تطبيق قالب « ${nameAr} »`,
        description: "افتح متجرك لرؤية الهوية الجديدة",
      });
      setPreviewTheme(null);
    } catch (err) {
      toast({
        title: "تعذر تطبيق القالب",
        description: err instanceof Error ? err.message : "حاول مجددًا",
        variant: "destructive",
      });
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* الترويسة */}
      <div className="flex flex-col gap-2 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5 text-gold-strong" />
          </div>
          <div>
            <h1 className="font-display text-xl lg:text-2xl font-bold tracking-tight">
              معرض القوالب الفاخرة
            </h1>
            <p className="text-sm text-muted-foreground">
              20 هوية بصرية راقية — جرّبها وطّبّقها على متجرك بنقرة واحدة
            </p>
          </div>
        </div>
      </div>

      {/* أدوات التصفية */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center animate-fade-up stagger-1">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="ابحث باسم القالب أو نوع المنتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-border/80 bg-card shadow-soft pr-10 pl-4 py-2.5 text-sm outline-none transition-all duration-300 focus:ring-4 focus:ring-gold/15 focus:border-gold/40"
            aria-label="البحث في القوالب"
          />
        </div>
      </div>

      {/* شرائح القطاعات */}
      <div
        className="flex gap-2 overflow-x-auto custom-scrollbar pb-1.5 animate-fade-up stagger-2"
        role="tablist"
        aria-label="تصفية حسب القطاع"
      >
        {categories.map((c) => {
          const active = cat === c.key;
          return (
            <button
              key={c.key}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setCat(c.key);
                haptic(15);
              }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active
                  ? "bg-gradient-to-l from-gold-strong to-gold text-white border-transparent shadow-md shadow-gold/25"
                  : "bg-card text-muted-foreground border-border/70 hover:border-gold/40 hover:text-foreground"
              )}
            >
              <span aria-hidden>{c.icon}</span>
              {c.key === "all" ? c.label : LUX_CATEGORY_LABELS[c.key as LuxCategory]}
            </button>
          );
        })}
      </div>

      {/* شبكة القوالب */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((t, i) => {
          const isCurrent = t.id === currentTheme;
          return (
            <div
              key={t.id}
              className={cn(
                "group relative rounded-3xl border bg-card p-2.5 lift hover:shadow-lift animate-fade-up",
                isCurrent
                  ? "border-gold/60 ring-2 ring-gold/30 shadow-[0_10px_36px_-12px_rgba(212,175,55,0.45)]"
                  : "border-border/70 hover:border-gold/30"
              )}
              style={{ animationDelay: `${Math.min(i * 45, 450)}ms` }}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 right-4 z-10 bg-gradient-to-l from-gold-strong to-gold text-white border-0 shadow-md gap-1 rounded-full">
                  <Check className="w-3 h-3" />
                  القالب الحالي
                </Badge>
              )}

              <div className="relative">
                <ThemePreview themeId={t.id} className="border border-border/50" />
                {/* زر معاينة عائم */}
                <button
                  onClick={() => {
                    setPreviewTheme(t);
                    haptic(20);
                  }}
                  aria-label={`معاينة قالب ${t.nameAr}`}
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 opacity-0 group-hover:opacity-100 transition-all duration-300 outline-none focus-visible:opacity-100"
                >
                  <span className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/30 px-3.5 py-1.5 text-xs font-bold text-white">
                    <Eye className="w-3.5 h-3.5" />
                    معاينة
                  </span>
                </button>
              </div>

              <div className="px-1.5 pt-2.5 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn("font-bold text-sm truncate", t.styles.fontClass)}>
                      <span className="ml-1" aria-hidden>{t.icon}</span>
                      {t.nameAr}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground truncate">
                      {t.nameFr}
                    </p>
                  </div>
                  <span className="text-[9px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground whitespace-nowrap">
                    {LUX_CATEGORY_LABELS[t.category].split(" ")[0]}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed min-h-8">
                  {t.idealFor}
                </p>
                <Button
                  size="sm"
                  disabled={isCurrent || applying === t.id}
                  onClick={() => applyTheme(t.id, t.nameAr)}
                  className={cn(
                    "w-full mt-2.5 h-9 rounded-xl text-[13px] font-bold gap-1.5",
                    isCurrent
                      ? "bg-muted text-muted-foreground border border-border"
                      : "gold-glow-button border-0"
                  )}
                >
                  {applying === t.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isCurrent ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      مُطبَّق
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      تطبيق على متجري
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-3xl">
          لا توجد قوالب مطابقة لبحثك
        </div>
      )}

      {/* نافذة المعاينة الكبيرة */}
      <Dialog open={!!previewTheme} onOpenChange={(open) => !open && setPreviewTheme(null)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto custom-scrollbar">
          {previewTheme && (
            <>
              <DialogHeader>
                <DialogTitle
                  className={`font-display text-xl text-right ${previewTheme.styles.fontClass}`}
                >
                  <span aria-hidden className="ml-1.5">{previewTheme.icon}</span>
                  {previewTheme.nameAr}
                  <span className="block text-xs font-normal text-muted-foreground mt-1">
                    {previewTheme.nameFr} — {LUX_CATEGORY_LABELS[previewTheme.category]}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-right leading-relaxed">
                  هكذا سيرى الزبائن متجرك بقالب « {previewTheme.nameAr} » — مناسب لـ{" "}
                  {previewTheme.idealFor}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="relative mx-auto w-full max-w-[280px]">
                  {/* إطار هاتف */}
                  <div className="rounded-[2rem] border-[6px] border-foreground/85 dark:border-white/85 shadow-2xl overflow-hidden bg-black">
                    <ThemePreview
                      themeId={previewTheme.id}
                      className="rounded-[1.6rem]"
                      storeName="متجر النور"
                    />
                  </div>
                </div>

                {/* لوحة الألوان */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { c: "خلفية الصفحة", v: previewTheme.styles.bodyBg },
                    { c: "التمييز", v: previewTheme.styles.accent },
                    { c: "السعر", v: previewTheme.styles.priceColor },
                    { c: "الحدود", v: previewTheme.styles.border },
                  ].map((chip) => (
                    <span
                      key={chip.c}
                      className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[10px] text-muted-foreground"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10"
                        style={{ background: chip.v }}
                      />
                      {chip.c}
                    </span>
                  ))}
                </div>

                {previewTheme.id !== currentTheme ? (
                  <Button
                    disabled={applying === previewTheme.id}
                    onClick={() => applyTheme(previewTheme.id, previewTheme.nameAr)}
                    className="w-full h-12 text-base gold-glow-button border-0 rounded-2xl gap-2"
                  >
                    {applying === previewTheme.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4.5 h-4.5" />
                    )}
                    تطبيق « {previewTheme.nameAr} » على متجري
                  </Button>
                ) : (
                  <div className="text-center text-sm font-semibold text-gold-strong bg-gold-soft border border-gold/30 rounded-2xl py-3">
                    ✓ هذا هو قالب متجرك الحالي
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
