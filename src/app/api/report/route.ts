import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendSalesReport } from "@/lib/telegram";
import { getWilayaByCode } from "@/lib/wilayas";
import { checkRateLimit } from "@/lib/ratelimit";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const rl = checkRateLimit(`report:${user.id}`, 6, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `طلبات كثيرة، حاول بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429 }
      );
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    if (!store.telegramBotToken || !store.telegramChatId) {
      return NextResponse.json(
        { error: "لم تربط حساب تليجرام بعد. اربطه أولًا من الإعدادات" },
        { status: 400 }
      );
    }

    const orders = await db.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
    });

    let deliveredRevenue = 0;
    let pipelineRevenue = 0;
    let newOrders = 0;
    const productCount = new Map<string, number>();
    const wilayaCount = new Map<number, number>();

    for (const o of orders) {
      if (o.status === "CANCELLED") continue;
      if (o.status === "NEW") newOrders += 1;
      if (o.status === "DELIVERED") deliveredRevenue += o.total;
      else if (["NEW", "PROCESSING", "SHIPPED"].includes(o.status)) {
        pipelineRevenue += o.total;
      }
      productCount.set(o.productName, (productCount.get(o.productName) || 0) + o.quantity);
      wilayaCount.set(o.wilayaCode, (wilayaCount.get(o.wilayaCode) || 0) + 1);
    }

    const topProduct = [...productCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const topWilayaCode = [...wilayaCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topWilaya = topWilayaCode
      ? getWilayaByCode(topWilayaCode)?.nameAr || null
      : null;

    const now = new Date();
    const period = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const sent = await sendSalesReport(store.telegramBotToken, store.telegramChatId, {
      storeName: store.name,
      totalOrders: orders.length,
      newOrders,
      deliveredRevenue: Math.round(deliveredRevenue),
      pipelineRevenue: Math.round(pipelineRevenue),
      topProduct,
      topWilaya,
      period,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "فشل إرسال التقرير إلى تليجرام. تحقق من بيانات البوت" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("report error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
