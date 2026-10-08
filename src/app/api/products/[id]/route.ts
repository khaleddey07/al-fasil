import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { optimizeProductImage } from "@/lib/images";
import { cleanOptions, parseStock } from "../route";

type Params = { params: Promise<{ id: string }> };

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
    const product = await db.product.findFirst({
      where: { id, storeId: store.id },
    });
    if (!product) {
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return NextResponse.json({ error: "اسم المنتج قصير جدًا" }, { status: 400 });
      }
      data.name = name;
    }
    if (body.description !== undefined) {
      data.description = String(body.description).trim() || null;
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "السعر غير صالح" }, { status: 400 });
      }
      data.price = price;
    }
    if (body.imageUrl !== undefined) {
      let imageUrl = body.imageUrl ? String(body.imageUrl) : null;
      // نسمح بصور أكبر عند الرفع لأن الخادم يعيد ضغطها (sharp → WebP 80%)
      if (imageUrl && imageUrl.length > 4_000_000) {
        return NextResponse.json({ error: "حجم الصورة كبير جدًا" }, { status: 400 });
      }
      if (imageUrl) {
        imageUrl = await optimizeProductImage(imageUrl);
        if (imageUrl.length > 900_000) {
          return NextResponse.json(
            { error: "الصورة ثقيلة جدًا حتى بعد الضغط، جرب صورة أبسط" },
            { status: 400 }
          );
        }
      }
      data.imageUrl = imageUrl;
    }
    if (body.options !== undefined) {
      const clean = Array.isArray(body.options) ? cleanOptions(body.options) : [];
      data.options = clean.length ? JSON.stringify(clean) : null;
    }
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }
    if (body.stock !== undefined) {
      data.stock = parseStock(body.stock);
    }

    await db.product.update({ where: { id: product.id }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("product PATCH error:", err);
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
    const product = await db.product.findFirst({
      where: { id, storeId: store.id },
    });
    if (!product) {
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    // التحقق من وجود طلبيات مرتبطة
    const ordersCount = await db.order.count({ where: { productId: product.id } });
    if (ordersCount > 0) {
      // أرشفة بدلًا من الحذف للحفاظ على سجل الطلبيات
      await db.product.update({
        where: { id: product.id },
        data: { isActive: false },
      });
      return NextResponse.json({
        ok: true,
        archived: true,
        message: "المنتج مرتبط بطلبيات، تم إخفاؤه من المتجر بدلًا من حذفه",
      });
    }

    await db.product.delete({ where: { id: product.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("product DELETE error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
