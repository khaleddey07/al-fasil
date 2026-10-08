import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { optimizeProductImage } from "@/lib/images";
import type { ProductDTO, ProductOption } from "@/lib/souq-types";

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

    const products = await db.product.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
    });

    const dto: ProductDTO[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      imageUrl: p.imageUrl,
      options: parseOptions(p.options),
      isActive: p.isActive,
      stock: p.stock,
      videoUrl: p.videoStatus === "ready" ? p.videoUrl : null,
      videoStatus: p.videoStatus,
      videoScript: p.videoScript,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ products: dto });
  } catch (err) {
    console.error("products GET error:", err);
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
    const description = String(body.description || "").trim() || null;
    const price = Number(body.price);
    let imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    const isActive = body.isActive !== false;

    if (name.length < 2) {
      return NextResponse.json({ error: "اسم المنتج قصير جدًا" }, { status: 400 });
    }
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: "السعر غير صالح" }, { status: 400 });
    }
    // نسمح بصور أكبر عند الرفع (حتى 4MB) لأن الخادم يعيد ضغطها
    if (imageUrl && imageUrl.length > 4_000_000) {
      return NextResponse.json({ error: "حجم الصورة كبير جدًا" }, { status: 400 });
    }

    // ————— تحسين الصورة على الخادم (متطلب الوثيقة: sharp → WebP 80%) —————
    // تصغير الأبعاد إلى 900px + تحويل إلى WebP بجودة 80%:
    // يقلل الحجم من ميغابايتات إلى أقل من 150KB لسرعة التحميل على 3G/4G
    if (imageUrl) {
      imageUrl = await optimizeProductImage(imageUrl);
      if (imageUrl.length > 900_000) {
        return NextResponse.json(
          { error: "الصورة ثقيلة جدًا حتى بعد الضغط، جرب صورة أبسط" },
          { status: 400 }
        );
      }
    }

    let optionsJson: string | null = null;
    if (Array.isArray(body.options)) {
      const clean = cleanOptions(body.options);
      optionsJson = clean.length ? JSON.stringify(clean) : null;
    }

    const product = await db.product.create({
      data: {
        storeId: store.id,
        name,
        description,
        price,
        imageUrl,
        options: optionsJson,
        isActive,
        ...(body.stock !== undefined
          ? { stock: parseStock(body.stock) }
          : {}),
      },
    });

    return NextResponse.json({ id: product.id });
  } catch (err) {
    console.error("products POST error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}

export function parseOptions(json: string | null): ProductOption[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (o) =>
          o &&
          typeof o === "object" &&
          typeof o.name === "string" &&
          Array.isArray(o.choices)
      )
      .map((o) => ({ name: o.name, choices: o.choices.filter((c: unknown) => typeof c === "string") }));
  } catch {
    return [];
  }
}

export function cleanOptions(raw: unknown[]): ProductOption[] {
  return raw
    .filter(
      (o): o is { name: string; choices: string[] } =>
        !!o &&
        typeof o === "object" &&
        typeof (o as { name?: unknown }).name === "string" &&
        Array.isArray((o as { choices?: unknown }).choices)
    )
    .map((o) => ({
      name: o.name.trim(),
      choices: o.choices
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        .map((c) => c.trim())
        .slice(0, 12),
    }))
    .filter((o) => o.name && o.choices.length >= 2)
    .slice(0, 5);
}

/** قراءة المخزون: null = غير محدود، 1-99999 كمية محدودة */
export function parseStock(value: unknown): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const n = Math.floor(Number(value));
  if (isNaN(n) || n < 1 || n > 99999) return null;
  return n;
}
