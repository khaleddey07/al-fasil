"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlgeriaMap } from "./algeria-map";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  ShoppingBag,
  Package,
  TrendingUp,
  Loader2,
  Inbox,
} from "lucide-react";
import {
  formatDZD,
  formatDateAr,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/souq-types";
import type { StatsDTO } from "@/lib/souq-types";

export function StatsView({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        if (active) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm">تعذر تحميل الإحصائيات</p>
      </div>
    );
  }

  const cards = [
    {
      title: "مبيعات مسلمة",
      value: formatDZD(stats.totalRevenue),
      icon: Banknote,
      hint: "إجمالي الطلبيات المسلّمة",
      tone: "text-primary bg-primary/10 border border-primary/15",
      featured: true,
    },
    {
      title: "طلبيات جارية",
      value: String(
        stats.ordersByStatus.NEW +
          stats.ordersByStatus.PROCESSING +
          stats.ordersByStatus.SHIPPED
      ),
      icon: ShoppingBag,
      hint: `${formatDZD(stats.pipelineRevenue)} قيمتها`,
      tone: "text-gold-foreground bg-gold-soft border border-gold/30",
      featured: false,
    },
    {
      title: "إجمالي الطلبيات",
      value: String(stats.ordersCount),
      icon: TrendingUp,
      hint: `${stats.ordersByStatus.CANCELLED} ملغاة`,
      tone: "text-teal-700 bg-teal-50 border border-teal-200/60",
      featured: false,
    },
    {
      title: "المنتجات",
      value: String(stats.productsCount),
      icon: Package,
      hint: `${stats.activeProductsCount} معروضة حاليًا`,
      tone: "text-violet-700 bg-violet-50 border border-violet-200/60",
      featured: false,
    },
  ];

  const hasOrders = stats.ordersCount > 0;

  return (
    <div className="space-y-6">
      {/* بطاقات الملخص */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card
            key={c.title}
            className={`lift hover:shadow-lift animate-fade-up stagger-${i + 1} ${
              c.featured ? "bg-gradient-to-br from-card to-primary/[0.05] border-primary/20" : ""
            }`}
          >
            <CardContent className="p-5">
              <div className={`p-2.5 rounded-xl w-fit ${c.tone}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <p className="mt-4 font-display text-xl lg:text-[1.55rem] font-bold tracking-tight tabular-nums">
                {c.value}
              </p>
              <p className="text-xs font-semibold text-foreground/75 mt-0.5">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* مخطط مبيعات الأسبوع */}
        <Card className="animate-fade-up stagger-3">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">مبيعات آخر 7 أيام</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {hasOrders ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklySales} margin={{ top: 8, left: 0, right: 8 }}>
                  <defs>
                    <linearGradient id="salesBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.105 164)" />
                      <stop offset="100%" stopColor="oklch(0.40 0.085 168)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="color-mix(in oklab, var(--border) 80%, transparent)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(value) => [formatDZD(Number(value)), "المبيعات"]}
                    cursor={{ fill: "color-mix(in oklab, var(--primary) 6%, transparent)" }}
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid color-mix(in oklab, var(--border) 90%, transparent)",
                      boxShadow: "0 12px 32px -12px rgba(15,35,28,0.25)",
                      fontSize: 12,
                      fontFamily: "var(--font-plex)",
                      direction: "rtl",
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="url(#salesBar)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Inbox className="w-7 h-7" />
                </div>
                <p className="text-sm">لا توجد طلبيات بعد</p>
                <p className="text-xs">شارك رابط متجرك لتبدأ البيع</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* المنتجات الأكثر مبيعًا */}
        <Card className="animate-fade-up stagger-4">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">الأكثر مبيعًا</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                ستظهر منتجاتك الأكثر طلبًا هنا
              </div>
            ) : (
              <div className="space-y-3.5">
                {stats.topProducts.map((p, i) => (
                  <div
                    key={p.name + i}
                    className="group flex items-center gap-3.5 rounded-xl p-2 -m-2 transition-colors duration-300 hover:bg-muted/60"
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                        i === 0
                          ? "bg-gold-soft text-gold-foreground ring-1 ring-gold/40"
                          : i === 1
                            ? "bg-slate-100 text-slate-600 ring-1 ring-slate-300/70"
                            : i === 2
                              ? "bg-orange-50 text-orange-700 ring-1 ring-orange-300/50"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.count} وحدة مبيعة · {formatDZD(p.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* خريطة الطلبيات عبر الوطن */}
      <Card className="animate-fade-up stagger-5">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            خريطة الطلبيات عبر الوطن
            <span className="text-[10px] font-semibold text-gold-strong bg-gold-soft border border-gold/30 rounded-full px-2 py-0.5">
              58 ولاية
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlgeriaMap data={stats.ordersByWilaya} />
        </CardContent>
      </Card>

      {/* آخر الطلبيات */}
      <Card className="animate-fade-up stagger-6">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">آخر الطلبيات</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              لا توجد طلبيات بعد — شارك رابط متجرك مع زبائنك
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="text-right font-semibold">الزبون</TableHead>
                    <TableHead className="text-right font-semibold">المنتج</TableHead>
                    <TableHead className="text-right font-semibold hidden md:table-cell">الولاية</TableHead>
                    <TableHead className="text-right font-semibold">الإجمالي</TableHead>
                    <TableHead className="text-right font-semibold">الحالة</TableHead>
                    <TableHead className="text-right font-semibold hidden lg:table-cell">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.customerName}</TableCell>
                      <TableCell className="max-w-40">
                        <span className="block truncate">{o.productName}</span>
                        <span className="text-xs text-muted-foreground">×{o.quantity}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{o.wilayaName}</TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">
                        {formatDZD(o.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${ORDER_STATUS_COLORS[o.status]} whitespace-nowrap`}
                        >
                          {ORDER_STATUS_LABELS[o.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateAr(o.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
