import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ORDER_STATUS_LABELS } from "@/lib/souq-types";
import type { OrderDTO, OrderStatus } from "@/lib/souq-types";

const VALID_STATUSES = Object.keys(ORDER_STATUS_LABELS);

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const statusFilter = req.nextUrl.searchParams.get("status");
    const where: Record<string, unknown> = { storeId: store.id };
    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      where.status = statusFilter;
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { affiliate: { select: { code: true, name: true } } },
    });

    const dto: OrderDTO[] = orders.map((o) => ({
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
      affiliateCode: o.affiliate?.code || null,
      commission: o.commission,
      source: o.source,
      createdAt: o.createdAt.toISOString(),
    }));

    return NextResponse.json({ orders: dto });
  } catch (err) {
    console.error("orders GET error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
