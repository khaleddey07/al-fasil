import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/blacklist";

/**
 * القائمة السوداء للزبناء الوهميين — إدارة التاجر
 * GET    → قائمة الأرقام المحجوبة
 * POST   { phone, note? } → تسجيل رقم
 * DELETE ?id= → إزالة رقم
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const records = await db.blacklistedCustomer.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        phone: r.phone,
        failedDeliveries: r.failedDeliveries,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("blacklist GET error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const rawPhone = String(body.phone || "").replace(/\s/g, "");
    const note = String(body.note || "").trim() || null;

    if (!/^0[5-7][0-9]{8}$/.test(rawPhone)) {
      return NextResponse.json(
        { error: "رقم هاتف غير صالح (مثال: 0550123456)" },
        { status: 400 }
      );
    }

    const record = await db.blacklistedCustomer.upsert({
      where: { phone: normalizePhone(rawPhone) },
      create: { phone: normalizePhone(rawPhone), failedDeliveries: 1, note },
      update: { failedDeliveries: { increment: 1 }, ...(note ? { note } : {}) },
    });

    return NextResponse.json({
      record: {
        id: record.id,
        phone: record.phone,
        failedDeliveries: record.failedDeliveries,
        note: record.note,
        createdAt: record.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("blacklist POST error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id") || "";
    const record = await db.blacklistedCustomer.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
    }

    await db.blacklistedCustomer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("blacklist DELETE error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
