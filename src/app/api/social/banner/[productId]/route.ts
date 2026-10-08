import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLuxTheme } from "@/lib/lux-themes";
import { generateLuxurySocialBanner } from "@/lib/social-banner";

/**
 * رابط عام للبانر الفاخر (يستخدمه فيسبوك/إنستغرام/تيك توك/تليجرام لجلب الصورة)
 * GET /api/social/banner/[productId][?format=jpg|webp]
 * بانر ثابت لكل منتج (يتغير تلقائيًا مع السعر/القالب) — قابل للتخزين المؤقت
 */

type Params = { params: Promise<{ productId: string }> };

function decodeImage(dataUrl: string | null): Buffer | null {
  if (!dataUrl) return null;
  const match = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { productId } = await params;
    const format = (req.nextUrl.searchParams.get("format") || "webp").toLowerCase();

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });
    if (!product || !product.isActive) {
      return new NextResponse("Not found", { status: 404 });
    }

    const theme = getLuxTheme(product.store.luxTheme);
    const banner = await generateLuxurySocialBanner({
      imageBuffer: decodeImage(product.imageUrl),
      title: product.name,
      price: product.price,
      themeColor: theme?.styles?.accent || "#D4AF37",
      storeName: product.store.name,
    });

    let body = banner;
    let contentType = "image/webp";
    if (format === "jpg" || format === "jpeg") {
      const sharp = (await import("sharp")).default;
      body = await sharp(banner).jpeg({ quality: 90 }).toBuffer();
      contentType = "image/jpeg";
    }

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("social banner GET error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
