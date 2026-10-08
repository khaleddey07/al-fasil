"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckoutDialog } from "./checkout-dialog";
import { UrgencyBanner } from "./urgency-banner";
import { Reveal } from "./reveal";
import { ThemeToggle } from "./theme-toggle";
import { formatDZD } from "@/lib/souq-types";
import type { ProductDTO, StorePublicDTO, DeliveryFeeEntry } from "@/lib/souq-types";
import { getLuxTheme } from "@/lib/lux-themes";
import type { LuxTheme } from "@/lib/lux-themes";
import { cn } from "@/lib/utils";
import {
  Store,
  Package,
  Truck,
  BadgeCheck,
  Phone,
  Search,
  CheckCircle2,
  ShieldCheck,
  Megaphone,
  PlayCircle,
  Flame,
} from "lucide-react";

interface StorefrontProps {
  slug: string;
}

export interface StoreData {
  store: StorePublicDTO & {
    defaultHomeFee: number;
    defaultDeskFee: number;
    deliveryFees: Record<string, DeliveryFeeEntry>;
  };
  products: ProductDTO[];
}

/**
 * واجهة المتجر العام التي يراها الزبائن — تتلون ديناميكيًا بقالب Lux
 * الذي اختاره التاجر من معرض القوالب الفاخرة العشرين
 */
export function Storefront({ slug }: StorefrontProps) {
  const [data, setData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<ProductDTO | null>(null);
  const [search, setSearch] = useState("");
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    // التقاط رمز المسوق من الرابط (?ref=CODE) وحفظه 30 يومًا
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      const clean = ref.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);
      if (clean) {
        try {
          localStorage.setItem(`souq-ref:${slug}`, JSON.stringify({ code: clean, at: Date.now() }));
        } catch {
          // التخزين غير متاح
        }
        setRefCode(clean);
      }
    } else {
      // استرجاع رمز سابق (صالح 30 يومًا)
      try {
        const saved = localStorage.getItem(`souq-ref:${slug}`);
        if (saved) {
          const parsed = JSON.parse(saved) as { code: string; at: number };
          if (parsed.code && Date.now() - parsed.at < 30 * 24 * 60 * 60 * 1000) {
            setRefCode(parsed.code);
          }
        }
      } catch {
        // تجاهل
      }
    }
  }, [slug]);

  useEffect(() => {
    fetch(`/api/store/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "المتجر غير موجود");
        }
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.products;
    const q = search.trim().toLowerCase();
    return data.products.filter((p) => p.name.toLowerCase().includes(q));
  }, [data, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary via-deep to-deeper pb-20 pt-12 px-4 relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-30" />
          <div className="max-w-5xl mx-auto relative flex items-center gap-4">
            <Skeleton className="w-22 h-22 rounded-3xl bg-white/20" />
            <div className="space-y-2.5">
              <Skeleton className="h-7 w-44 bg-white/20 rounded-lg" />
              <Skeleton className="h-4 w-64 bg-white/15 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 -mt-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="rounded-2xl h-72" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center gap-4">
        <div className="w-20 h-20 rounded-3xl bg-muted border border-border flex items-center justify-center">
          <Package className="w-9 h-9 text-muted-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">المتجر غير موجود</h1>
          <p className="text-sm text-muted-foreground max-w-xs mt-2 leading-relaxed">
            الرابط الذي فتحته غير صحيح أو أن المتجر لم يعد متوفرًا
          </p>
        </div>
        <a
          href="/"
          className="text-primary text-sm font-semibold hover:underline flex items-center gap-1.5 transition-colors"
        >
          <Store className="w-4 h-4" />
          أنشئ متجرك مجانًا في سوقي
        </a>
      </div>
    );
  }

  const { store, products } = data;
  const t: LuxTheme = getLuxTheme(store.luxTheme);
  const s = t.styles;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: s.bodyBg }}>
      {/* شريط الاستعجال والندرة — أعلى الصفحة تمامًا */}
      {store.urgencyEnabled && (
        <UrgencyBanner
          stockLeft={store.urgencyStock}
          initialMinutes={store.urgencyMinutes}
          storageKey={slug}
        />
      )}

      {/* مفتاح الوضع الداكن — للمواثل المحايدة (تفاصيل المنتج والدفع) */}
      <div className="fixed top-4 left-4 z-50 animate-fade-in">
        <ThemeToggle variant="floating" />
      </div>

      {/* شارة رمز المسوق */}
      {refCode && (
        <div
          className="fixed top-4 right-4 z-50 animate-fade-in rounded-full border px-3 py-1.5 text-[11px] font-bold backdrop-blur-md flex items-center gap-1.5"
          style={{ background: s.badgeBg, borderColor: s.badgeBorder, color: s.badgeText }}
        >
          <Megaphone className="w-3 h-3" style={{ color: s.accent }} />
          عرض المسوّق: <span dir="ltr" style={{ color: s.accent }}>{refCode}</span>
        </div>
      )}

      {/* رأس المتجر — بهوية القالب الفاخر */}
      <header
        className="relative overflow-hidden"
        style={{ background: s.heroBg, color: s.heroText }}
      >
        {/* نمط القالب */}
        {s.pattern === "dots" && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.24) 1.2px, transparent 1.2px)",
              backgroundSize: "22px 22px",
            }}
          />
        )}
        {s.pattern === "grid" && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
        )}

        {/* كرات توهج بلون القالب */}
        <div
          className="absolute -top-24 -left-20 w-80 h-80 rounded-full blur-3xl float-slow"
          style={{ background: s.glow1 }}
        />
        <div
          className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full blur-3xl float-slower"
          style={{ background: s.glow2 }}
        />

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-18">
          <div className="flex items-center gap-5 animate-fade-up">
            {store.logo ? (
              <img
                src={store.logo}
                alt={`شعار ${store.name}`}
                className="w-22 h-22 rounded-3xl object-cover shadow-lift"
                style={{ border: `2px solid ${s.accent}` }}
              />
            ) : (
              <div
                className="w-22 h-22 rounded-3xl flex items-center justify-center border shadow-lift"
                style={{ background: s.badgeBg, borderColor: s.badgeBorder }}
              >
                <Store className="w-10 h-10" style={{ color: s.heroText }} />
              </div>
            )}
            <div className="min-w-0">
              <h1
                className={cn(
                  "font-display text-2xl sm:text-3xl font-extrabold tracking-tight truncate",
                  s.fontClass
                )}
              >
                {store.name}
              </h1>
              {store.description && (
                <p
                  className="text-sm mt-1.5 line-clamp-2 leading-relaxed"
                  style={{ color: s.heroMuted }}
                >
                  {store.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3.5">
                {[
                  { icon: BadgeCheck, label: "متجر موثوق" },
                  { icon: Truck, label: "توصيل 58 ولاية" },
                ].map((b) => (
                  <span
                    key={b.label}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md"
                    style={{
                      background: s.badgeBg,
                      borderColor: s.badgeBorder,
                      color: s.badgeText,
                    }}
                  >
                    <b.icon className="w-3.5 h-3.5" style={{ color: s.accent }} />
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* المنتجات */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 -mt-10 pb-16 relative">
        <Reveal>
          <div className="relative mb-6">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 pointer-events-none"
              style={{ color: s.cardText, opacity: 0.5 }}
            />
            <input
              type="search"
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl shadow-lift px-11 py-3.5 text-sm outline-none transition-all duration-300"
              style={{
                background: s.cardBg,
                border: `1px solid ${s.border}`,
                color: s.cardText,
              }}
              aria-label="البحث في المنتجات"
            />
          </div>
        </Reveal>

        {products.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 text-center gap-3 rounded-3xl"
            style={{
              border: `2px dashed ${s.border}`,
              background: s.cardBg,
              color: s.cardText,
            }}
          >
            <div
              className="w-18 h-18 rounded-3xl flex items-center justify-center"
              style={{ background: s.accentSoft }}
            >
              <Package className="w-8 h-8" style={{ color: s.accent }} />
            </div>
            <p className={cn("font-display font-bold text-lg", s.fontClass)}>
              لا توجد منتجات معروضة حاليًا
            </p>
            <p className="text-sm" style={{ color: s.cardText, opacity: 0.6 }}>
              عودة لاحقًا لمتابعة جديد المتجر
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="py-20 text-center text-sm"
            style={{ color: s.cardText, opacity: 0.65 }}
          >
            لا نتائج للبحث عن &quot;{search}&quot;
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((p, i) => (
              <Reveal key={p.id} delay={(i % 6) * 60}>
                <div
                  className="group overflow-hidden h-full cursor-pointer rounded-2xl lift transition-all duration-300"
                  style={{
                    background: s.cardBg,
                    border: `1px solid ${s.border}`,
                    backdropFilter: t.mode === "dark" ? "blur(10px)" : undefined,
                  }}
                  onClick={() => setSelectedProduct(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedProduct(p)}
                  aria-label={p.name}
                >
                  <div
                    className="relative aspect-square overflow-hidden"
                    style={{ background: s.accentSoft }}
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ color: s.accent, opacity: 0.6 }}
                      >
                        <Package className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="p-4 space-y-2">
                    <p
                      className={cn(
                        "font-semibold text-sm leading-snug line-clamp-2 min-h-10",
                        s.fontClass
                      )}
                      style={{ color: s.cardText }}
                    >
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className="font-display font-bold text-[15px] whitespace-nowrap"
                        style={{ color: s.priceColor }}
                      >
                        {formatDZD(p.price)}
                      </span>
                      <span
                        className="inline-flex items-center justify-center rounded-full h-8 text-xs font-bold px-3.5 transition-all duration-300 group-hover:-translate-y-0.5"
                        style={{ background: s.buttonBg, color: s.buttonText }}
                      >
                        اشترِ الآن
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </main>

      {/* شريط الثقة */}
      <div
        className="border-t"
        style={{ background: s.cardBg, borderColor: s.border }}
      >
        <div
          className="max-w-5xl mx-auto px-4 py-7 grid grid-cols-3 gap-4 text-center text-xs"
          style={{ color: s.cardText, opacity: 0.85 }}
        >
          {[
            { icon: Truck, label: "توصيل لكل الولايات" },
            { icon: ShieldCheck, label: "الدفع عند الاستلام" },
            {
              icon: Phone,
              label: store.phone ? `اتصل: ${store.phone}` : "طلب بدون حساب",
            },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2.5 group">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ background: s.accentSoft }}
              >
                <item.icon className="w-5 h-5" style={{ color: s.accent }} />
              </div>
              <span className="leading-snug">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <footer
        className="text-center text-xs py-5"
        style={{ background: s.footerBg, color: s.footerText }}
      >
        <p>
          مدعوم بواسطة{" "}
          <a
            href="/"
            className="font-display underline font-semibold transition-colors hover:opacity-80"
            style={{ color: s.accent }}
          >
            سوقي
          </a>{" "}
          — أنشئ متجرك الإلكتروني مجانًا
        </p>
      </footer>

      {/* نافذة تفاصيل المنتج — مواثل محايدة واضحة في كل القوالب */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto custom-scrollbar">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-right">
                  {selectedProduct.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {selectedProduct.videoUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-border/70 shadow-soft bg-black">
                    <video
                      src={selectedProduct.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full aspect-square object-contain"
                    />
                  </div>
                ) : selectedProduct.imageUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-border/70 shadow-soft">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      decoding="async"
                      className="w-full aspect-square object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-muted aspect-square flex items-center justify-center">
                    <Package className="w-16 h-16 text-muted-foreground/60" />
                  </div>
                )}

                <p className="font-display text-3xl font-extrabold text-primary tracking-tight">
                  {formatDZD(selectedProduct.price)}
                </p>

                {/* شريط المخزون المحدود */}
                {selectedProduct.stock != null && selectedProduct.stock > 0 && (
                  <p
                    className="text-xs font-bold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{ background: s.accentSoft, color: s.accent }}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    متبقي {selectedProduct.stock} قطعة فقط — اطلب قبل نفاد الكمية
                  </p>
                )}

                {selectedProduct.description && (
                  <>
                    <Separator />
                    <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
                      {selectedProduct.description}
                    </p>
                  </>
                )}

                {selectedProduct.options.length > 0 && (
                  <div className="space-y-2.5 rounded-2xl bg-muted/60 border border-border/60 p-4">
                    {selectedProduct.options.map((o) => (
                      <div key={o.name} className="text-sm">
                        <span className="font-semibold">{o.name}: </span>
                        <span className="text-muted-foreground">{o.choices.join("، ")}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  className="w-full h-12 text-base gap-2 rounded-2xl border-0 shadow-lg"
                  style={{
                    background: s.buttonBg,
                    color: s.buttonText,
                    boxShadow: `0 10px 28px -10px ${s.accent}66`,
                  }}
                  onClick={() => {
                    setCheckoutProduct(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  <Truck className="w-5 h-5" />
                  اطلب الآن — الدفع عند الاستلام
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة إتمام الطلب */}
      <CheckoutDialog
        slug={slug}
        product={checkoutProduct}
        store={data.store}
        refCode={refCode}
        onOpenChange={(open) => !open && setCheckoutProduct(null)}
      />
    </div>
  );
}
