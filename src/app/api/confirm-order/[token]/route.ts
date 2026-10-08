import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

type Params = { params: Promise<{ token: string }> };

/**
 * تأكيد العنوان التلقائي عبر واتساب — صفحة عامة للزبون
 * GET  → ملخص الطلبية (بدون بيانات حساسة) للتأكيد
 * POST { commune?, address?, notes? } → تأكيد العنوان وإشعار التاجر
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const order = await db.order.findUnique({
      where: { confirmToken: token },
      include: { store: { select: { name: true, slug: true, logo: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "رابط التأكيد غير صالح" }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        productName: order.productName,
        quantity: order.quantity,
        selectedOption: order.selectedOption,
        customerName: order.customerName,
        wilayaName: order.wilayaName,
        commune: order.commune,
        address: order.address,
        deliveryType: order.deliveryType,
        total: order.total,
        status: order.status,
        confirmedAt: order.confirmedAt?.toISOString() || null,
        storeName: order.store.name,
      },
    });
  } catch (err) {
    console.error("confirm GET error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const order = await db.order.findUnique({
      where: { confirmToken: token },
      include: { store: true },
    });

    if (!order) {
      return NextResponse.json({ error: "رابط التأكيد غير صالح" }, { status: 404 });
    }
    if (order.confirmedAt) {
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        orderNumber: order.orderNumber,
      });
    }

    const body = await req.json().catch(() => ({}));
    const commune = String(body.commune || "").trim() || order.commune;
    const address = String(body.address || "").trim() || order.address;
    const notes = String(body.notes || "").trim() || order.notes;

    if (order.deliveryType === "home" && (!address || address.length < 5)) {
      return NextResponse.json(
        { error: "أدخل عنوان التوصيل الكامل للتأكيد" },
        { status: 400 }
      );
    }

    await db.order.update({
      where: { id: order.id },
      data: {
        confirmedAt: new Date(),
        commune,
        address,
        notes,
      },
    });

    // إشعار التاجر عبر تليجرام بأن الزبون أكد عنوانه
    if (order.store.telegramBotToken && order.store.telegramChatId) {
      const botToken = decryptSecret(order.store.telegramBotToken);
      const chatId = decryptSecret(order.store.telegramChatId);

      if (botToken && chatId) {
        const lines = [
          "✅ *تم تأكيد العنوان!*",
          "",
          `📦 الطلبية: \`${order.orderNumber}\``,
          `👤 الزبون: ${order.customerName}`,
          `📞 الهاتف: \`${order.customerPhone}\``,
          `📍 العنوان: ${address || "—"}${commune ? `، ${commune}` : ""}`,
          `🌍 الولاية: ${order.wilayaName}`,
          "",
          "جاهزة للمعالجة والشحن 🚚",
        ];

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: lines.join("\n"),
            parse_mode: "Markdown",
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    console.error("confirm POST error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
