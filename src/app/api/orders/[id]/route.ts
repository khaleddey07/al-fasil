import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ORDER_STATUS_LABELS } from "@/lib/souq-types";
import { reportFailedDelivery } from "@/lib/blacklist";
import type { OrderStatus } from "@/lib/souq-types";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = Object.keys(ORDER_STATUS_LABELS);

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const { id } = await params;
    const order = await db.order.findFirst({
      where: { id, storeId: store.id },
    });
    if (!order) {
      return NextResponse.json({ error: "الطلبية غير موجودة" }, { status: 404 });
    }

    const body = await req.json();
    const status = String(body.status || "");

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }

    // ————— عمولة المسوق: تُحتسب مرة واحدة عند تسليم الطلبية —————
    if (status === "DELIVERED" && order.status !== "DELIVERED" && order.affiliateId) {
      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: { status: status as OrderStatus },
        }),
        db.affiliate.update({
          where: { id: order.affiliateId },
          data: { totalEarned: { increment: order.commission } },
        }),
      ]);
      return NextResponse.json({ ok: true, commissionAccrued: order.commission });
    }

    // ————— تسجيل إرجاع (Retour): إلغاء + إضافة للقائمة السوداء —————
    if (body.reportRetour === true) {
      await db.order.update({
        where: { id: order.id },
        data: { status: status as OrderStatus },
      });
      await reportFailedDelivery(
        order.customerPhone,
        `طلبية ${order.orderNumber} مرجعة`
      );
      return NextResponse.json({ ok: true, blacklisted: true });
    }

    await db.order.update({
      where: { id: order.id },
      data: { status: status as OrderStatus },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("order PATCH error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const { id } = await params;
    const order = await db.order.findFirst({
      where: { id, storeId: store.id },
    });
    if (!order) {
      return NextResponse.json({ error: "الطلبية غير موجودة" }, { status: 404 });
    }

    await db.order.delete({ where: { id: order.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("order DELETE error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
