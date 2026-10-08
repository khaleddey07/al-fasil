"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatsView } from "./stats-view";
import { ProductsView } from "./products-view";
import { OrdersView } from "./orders-view";
import { SettingsView } from "./settings-view";
import { ThemesView } from "./themes-view";
import { AiStudioView } from "./ai-studio-view";
import { AffiliatesView } from "./affiliates-view";
import { SocialAccountsView } from "./social-accounts-view";
import { VoiceCommand } from "./voice-command";
import { ThemeToggle } from "./theme-toggle";
import { formatDZD } from "@/lib/souq-types";
import type { MeDTO, OrderDTO, OrderStatus, ProductDTO } from "@/lib/souq-types";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Settings,
  Palette,
  Store,
  LogOut,
  ExternalLink,
  Copy,
  Bell,
  Loader2,
  Sparkles,
  Megaphone,
  Share2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DashboardProps {
  me: MeDTO;
  onLogout: () => void;
}

type TabKey =
  | "stats"
  | "products"
  | "orders"
  | "themes"
  | "ai-studio"
  | "affiliates"
  | "networks"
  | "settings";

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "stats", label: "الرئيسية", icon: LayoutDashboard },
  { key: "products", label: "المنتجات", icon: Package },
  { key: "orders", label: "الطلبات", icon: ClipboardList },
  { key: "themes", label: "القوالب", icon: Palette },
  { key: "ai-studio", label: "استوديو AI", icon: Sparkles },
  { key: "affiliates", label: "المسوقون", icon: Megaphone },
  { key: "networks", label: "الشبكات", icon: Share2 },
  { key: "settings", label: "الإعدادات", icon: Settings },
];

export function Dashboard({ me, onLogout }: DashboardProps) {
  const [tab, setTab] = useState<TabKey>("stats");
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [current, setCurrent] = useState<MeDTO>(me);
  const [scrolled, setScrolled] = useState(false);

  // Détection du défilement pour l'en-tête semi-transparent
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    } catch {
      // تجاهل
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch {
      // تجاهل
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
    void loadOrders();
  }, [loadProducts, loadOrders]);

  // تحديث دوري للطلبات الجديدة (كل 30 ثانية)
  useEffect(() => {
    const interval = setInterval(() => {
      void loadOrders();
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  function reloadAll() {
    setRefreshKey((k) => k + 1);
    void loadProducts();
    void loadOrders();
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // تجاهل
    }
    onLogout();
  }

  function copyStoreUrl() {
    const url = `${window.location.origin}/?s=${current.store.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "تم نسخ رابط المتجر", description: url });
    });
  }

  const newOrdersCount = orders.filter((o) => o.status === ("NEW" as OrderStatus)).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* L'en-tête — fixe, fluide et semi-transparent au défilement */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 border-b ${
          scrolled
            ? "glass-strong shadow-[0_10px_40px_-18px_rgba(15,35,28,0.28)] border-border/70"
            : "bg-background/60 backdrop-blur-sm border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {current.store.logo ? (
              <img
                src={current.store.logo}
                alt="شعار المتجر"
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-gold/60 ring-offset-2 ring-offset-background shadow-sm"
              />
            ) : (
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-deep flex items-center justify-center shrink-0 shadow-md shadow-primary/25">
                <Store className="w-5.5 h-5.5 text-primary-foreground" />
                <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-gold ring-2 ring-background" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display font-bold text-base leading-tight truncate">
                {current.store.name}
              </p>
              <p
                className="text-[11px] text-muted-foreground truncate flex items-center gap-1"
                dir="ltr"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ?s={current.store.slug}
              </p>
            </div>
          </div>

          <div className="mr-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 hidden sm:inline-flex rounded-full"
              onClick={copyStoreUrl}
            >
              <Copy className="w-3.5 h-3.5" />
              نسخ الرابط
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => window.open(`/?s=${current.store.slug}`, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">معاينة المتجر</span>
            </Button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="القائمة"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-deep text-primary-foreground text-sm font-bold shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-primary/30 hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {current.user.name.charAt(0)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl p-1.5">
                <DropdownMenuLabel className="px-2.5 py-2">
                  <p className="font-semibold">{current.user.name}</p>
                  <p className="text-xs font-normal text-muted-foreground" dir="ltr">
                    {current.user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={copyStoreUrl}
                  className="gap-2 rounded-xl sm:hidden"
                >
                  <Copy className="w-4 h-4" />
                  نسخ رابط المتجر
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await handleLogout();
                  }}
                  className="gap-2 rounded-xl text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* التبويبات — مؤشر نشط متحرك على شكل شارة */}
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 flex gap-1.5 overflow-x-auto custom-scrollbar"
          aria-label="أقسام لوحة التحكم"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <t.icon
                  className={`w-4 h-4 transition-transform duration-300 ${
                    active ? "scale-110" : ""
                  }`}
                />
                {t.label}
                {t.key === "orders" && newOrdersCount > 0 && (
                  <Badge className="bg-gold text-gold-foreground hover:bg-gold text-[10px] h-5 min-w-5 px-1.5 rounded-full shadow-sm">
                    {newOrdersCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* المحتوى */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-9">
        <div key={tab} className="animate-fade-up">
          {tab === "stats" && <StatsView refreshKey={refreshKey} />}
          {tab === "products" && (
            <ProductsView
              products={products}
              loading={loadingProducts}
              onReload={reloadAll}
            />
          )}
          {tab === "orders" && (
            <OrdersView orders={orders} loading={loadingOrders} onReload={reloadAll} />
          )}
          {tab === "themes" && (
            <ThemesView
              currentTheme={current.store.luxTheme || "emerald-gold"}
              onThemeApplied={(themeId) =>
                setCurrent((prev) => ({
                  ...prev,
                  store: { ...prev.store, luxTheme: themeId },
                }))
              }
            />
          )}
          {tab === "ai-studio" && (
            <AiStudioView
              products={products}
              loading={loadingProducts}
              hasReplicateKey={current.store.hasReplicate}
              onProductsChanged={reloadAll}
            />
          )}
          {tab === "affiliates" && (
            <AffiliatesView storeSlug={current.store.slug} />
          )}
          {tab === "networks" && <SocialAccountsView />}
          {tab === "settings" && (
            <SettingsView
              me={current}
              onUpdated={(updated) => {
                setCurrent(updated);
                toast({ title: "تم تحديث بيانات المتجر" });
              }}
            />
          )}
        </div>
      </main>

      {/* مركز الأوامر الصوتية — زر ذهبي عائم */}
      <VoiceCommand
        products={products}
        currentTheme={current.store.luxTheme || "emerald-gold"}
        onThemeApplied={(themeId) =>
          setCurrent((prev) => ({
            ...prev,
            store: { ...prev.store, luxTheme: themeId },
          }))
        }
        onProductsChanged={reloadAll}
      />

      {/* الفوتر */}
      <footer className="mt-auto border-t border-border/70 bg-card/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
              <Store className="w-3 h-3 text-primary" />
            </span>
            <span className="font-display font-semibold text-foreground/70">سوقي</span>
            — منصة التجارة الإلكترونية الجزائرية
          </p>
          <p>
            {orders.length} طلبية · {products.length} منتج ·{" "}
            {formatDZD(
              orders
                .filter((o) => o.status === "DELIVERED")
                .reduce((s, o) => s + o.total, 0)
            )}{" "}
            مبيعات مسلمة
          </p>
        </div>
      </footer>
    </div>
  );
}
