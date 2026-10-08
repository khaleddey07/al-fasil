import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ORDER_STATUS_LABELS } from "@/lib/souq-types";
import type { OrderDTO, OrderStatus, StatsDTO } from "@/lib/souq-types";

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const [orders, products] = await Promise.all([
      db.order.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
      }),
      db.product.findMany({ where: { storeId: store.id } }),
    ]);

    // إحصائيات الحالات
    const ordersByStatus: Record<OrderStatus, number> = {
      NEW: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    let totalRevenue = 0;
    let pipelineRevenue = 0;

    for (const o of orders) {
      if (o.status in ordersByStatus) {
        ordersByStatus[o.status as OrderStatus] += 1;
      }
      if (o.status === "DELIVERED") {
        totalRevenue += o.total;
      } else if (["NEW", "PROCESSING", "SHIPPED"].includes(o.status)) {
        pipelineRevenue += o.total;
      }
    }

    // المنتجات الأكثر مبيعًا (حسب الكمية، باستثناء الملغاة)
    const productAgg = new Map<string, { name: string; count: number; revenue: number }>();
    for (const o of orders) {
      if (o.status === "CANCELLED") continue;
      const entry = productAgg.get(o.productId) || { name: o.productName, count: 0, revenue: 0 };
      entry.count += o.quantity;
      entry.revenue += o.total;
      productAgg.set(o.productId, entry);
    }
    const topProducts = Array.from(productAgg.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // توزيع الطلبيات حسب الولاية (للخريطة التفاعلية)
    const wilayaAgg = new Map<number, { count: number; total: number; newCount: number }>();
    for (const o of orders) {
      if (o.status === "CANCELLED") continue;
      const entry = wilayaAgg.get(o.wilayaCode) || { count: 0, total: 0, newCount: 0 };
      entry.count += 1;
      entry.total += o.total;
      if (o.status === "NEW") entry.newCount += 1;
      wilayaAgg.set(o.wilayaCode, entry);
    }
    const ordersByWilaya = Array.from(wilayaAgg.entries())
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => b.count - a.count);

    // مبيعات آخر 7 أيام
    const weeklySales: { day: string; total: number; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const dayOrders = orders.filter(
        (o) =>
          o.createdAt >= day &&
          o.createdAt < nextDay &&
          o.status !== "CANCELLED"
      );
      weeklySales.push({
        day: DAY_NAMES[day.getDay()],
        total: dayOrders.reduce((s, o) => s + o.total, 0),
        count: dayOrders.length,
      });
    }

    // آخر الطلبيات
    const recentOrders: OrderDTO[] = orders.slice(0, 8).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      productId: o.productId,
      productName: o.productName,
      unitPrice: o.unitPrice,
      quantity: o.quantity,
      selectedOption: o.selectedOption,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      wilayaCode: o.wilayaCode,
      wilayaName: o.wilayaName,
      commune: o.commune,
      address: o.address,
      deliveryType: o.deliveryType as "home" | "desk",
      deliveryFee: o.deliveryFee,
      total: o.total,
      status: o.status as OrderStatus,
      notes: o.notes,
      riskLevel: o.riskLevel === "HIGH" ? "HIGH" : o.riskLevel === "LOW" ? "LOW" : null,
      confirmedAt: o.confirmedAt?.toISOString() || null,
      affiliateCode: null,
      commission: o.commission,
      source: o.source,
      createdAt: o.createdAt.toISOString(),
    }));

    const stats: StatsDTO = {
      totalRevenue,
      pipelineRevenue,
      ordersCount: orders.length,
      ordersByStatus,
      productsCount: products.length,
      activeProductsCount: products.filter((p) => p.isActive).length,
      topProducts,
      weeklySales,
      recentOrders,
      ordersByWilaya,
    };

    return NextResponse.json({ stats });
  } catch (err) {
    console.error("stats error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
