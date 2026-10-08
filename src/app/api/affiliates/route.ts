import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateAffiliateCode, isValidCodeShape } from "@/lib/affiliate";

/**
 * نظام التسويق بالعمولة — إدارة المسوقين (Affiliate Engine)
 * GET    → قائمة المسوقين مع إحصاءاتهم
 * POST   → إضافة مسوق { name, phone?, commission? }
 * DELETE ?id= → حذف مسوق
 */
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

    const affiliates = await db.affiliate.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });

    const pendingCommissions = await db.order.aggregate({
      where: {
        storeId: store.id,
        affiliateId: { not: null },
        status: { in: ["NEW", "PROCESSING", "SHIPPED"] },
      },
      _sum: { commission: true },
    });

    return NextResponse.json({
      affiliates: affiliates.map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        code: a.code,
        commission: a.commission,
        totalEarned: a.totalEarned,
        ordersCount: a._count.orders,
        createdAt: a.createdAt.toISOString(),
      })),
      pendingCommissions: pendingCommissions._sum.commission || 0,
    });
  } catch (err) {
    console.error("affiliates GET error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim() || null;
    const commission = Number(body.commission ?? 10);

    if (name.length < 2) {
      return NextResponse.json({ error: "أدخل اسم المسوق" }, { status: 400 });
    }
    if (isNaN(commission) || commission < 0 || commission > 90) {
      return NextResponse.json(
        { error: "نسبة العمولة يجب أن تكون بين 0 و 90%" },
        { status: 400 }
      );
    }

    const count = await db.affiliate.count({ where: { storeId: store.id } });
    if (count >= 50) {
      return NextResponse.json(
        { error: "وصلت الحد الأقصى لعدد المسوقين (50)" },
        { status: 400 }
      );
    }

    const code = await generateAffiliateCode(name);
    if (!isValidCodeShape(code)) {
      return NextResponse.json({ error: "تعذر توليد رمز صالح" }, { status: 500 });
    }

    const affiliate = await db.affiliate.create({
      data: { storeId: store.id, name, phone, code, commission },
    });

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        phone: affiliate.phone,
        code: affiliate.code,
        commission: affiliate.commission,
        totalEarned: 0,
        ordersCount: 0,
        createdAt: affiliate.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("affiliates POST error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const id = req.nextUrl.searchParams.get("id") || "";
    const affiliate = await db.affiliate.findFirst({
      where: { id, storeId: store.id },
    });
    if (!affiliate) {
      return NextResponse.json({ error: "المسوق غير موجود" }, { status: 404 });
    }

    // فصل طلبياته قبل الحذف (لا تُحذف الطلبيات — فقط تنقطع نسبتها)
    await db.order.updateMany({
      where: { affiliateId: affiliate.id },
      data: { affiliateId: null, commission: 0 },
    });
    await db.affiliate.delete({ where: { id: affiliate.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("affiliates DELETE error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
