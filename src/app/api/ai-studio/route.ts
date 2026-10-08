import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { withQueue } from "@/lib/queue";
import { getStudioStyle, generateLuxuryStudioImage, STUDIO_STYLES } from "@/lib/ai-studio";

/**
 * استوديو التصوير الاحترافي بالذكاء الاصطناعي
 * POST { productId?, imageUrl, style } → { imageUrl }
 * يولد خلفية استوديو فاخرة للمنتج (وبديل: يطبقها مباشرة على المنتج)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const rl = checkRateLimit(`ai-studio:${getClientIp(req)}`, 12, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `طلبات كثيرة، حاول بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` },
        { status: 429 }
      );
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const productId = String(body.productId || "");
    const imageUrl = String(body.imageUrl || "");
    const style = getStudioStyle(String(body.style || ""));

    if (!imageUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "ارفع صورة المنتج أولًا" }, { status: 400 });
    }
    if (imageUrl.length > 4_500_000) {
      return NextResponse.json({ error: "حجم الصورة كبير جدًا" }, { status: 400 });
    }
    if (!style) {
      return NextResponse.json(
        { error: "اختر نمط استوديو", styles: STUDIO_STYLES.map((s) => s.id) },
        { status: 400 }
      );
    }

    if (productId) {
      const product = await db.product.findFirst({
        where: { id: productId, storeId: store.id },
      });
      if (!product) {
        return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
      }
    }

    // التوليد داخل طابور الذكاء الاصطناعي (توازية ≤ 2 لحماية الخادم)
    const generated = await withQueue(() =>
      generateLuxuryStudioImage(imageUrl, style, store.replicateToken)
    );

    // تطبيق الصورة الجديدة على المنتج مباشرة إذا طُلب ذلك
    if (productId) {
      await db.product.update({
        where: { id: productId },
        data: { imageUrl: generated },
      });
    }

    return NextResponse.json({ imageUrl: generated, styleId: style.id });
  } catch (err) {
    console.error("ai-studio error:", err);
    const message =
      err instanceof Error ? err.message : "تعذر توليد الصورة، حاول مجددًا";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
