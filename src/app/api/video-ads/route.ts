import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { withQueue } from "@/lib/queue";
import {
  generateAdScript,
  buildVideoPrompt,
  startVideoAdJob,
  getVideoAdStatus,
} from "@/lib/video-ads";

/**
 * مولد إعلانات الفيديو القصيرة لـ TikTok/Reels (9:16)
 * POST { productId } → يولد السسكربت بالذكاء الاصطناعي ويطلق مهمة
 *                      توليد الفيديو لدى Replicate (إن وُجد المفتاح)
 * GET  ?productId=   → يتابع حالة المهمة ويحفظ الفيديو عند الجهوزية
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const rl = checkRateLimit(`video-ads:${getClientIp(req)}`, 8, 10 * 60 * 1000);
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
    if (!productId) {
      return NextResponse.json({ error: "اختر المنتج" }, { status: 400 });
    }

    const product = await db.product.findFirst({
      where: { id: productId, storeId: store.id },
    });
    if (!product) {
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    // 1) توليد السسكربت التسويقي (دائمًا — لا يحتاج مفاتيح خارجية)
    const script = await withQueue(() =>
      generateAdScript({
        name: product.name,
        description: product.description,
        price: product.price,
      })
    );

    // 2) إطلاق توليد الفيديو الفعلي (محرك المنصة افتراضيًا أو Replicate إن وُجد المفتاح)
    let videoStarted = false;
    let videoError: string | null = null;

    if (product.imageUrl) {
      try {
        const job = await startVideoAdJob(
          {
            imageUrl: product.imageUrl,
            videoPrompt: buildVideoPrompt(product.name, script.hook),
          },
          store.replicateToken
        );
        await db.product.update({
          where: { id: product.id },
          data: {
            videoStatus: "pending",
            videoJobId: job.jobId,
            videoScript: script.fullScript,
          },
        });
        videoStarted = true;
      } catch (err) {
        videoError = err instanceof Error ? err.message : "فشل بدء توليد الفيديو";
        await db.product.update({
          where: { id: product.id },
          data: { videoStatus: "failed", videoScript: script.fullScript },
        });
      }
    } else {
      await db.product.update({
        where: { id: product.id },
        data: { videoScript: script.fullScript },
      });
      videoError = "أضف صورة للمنتج أولًا لتوليد الفيديو";
    }

    return NextResponse.json({
      script,
      videoStarted,
      videoError,
    });
  } catch (err) {
    console.error("video-ads POST error:", err);
    const message = err instanceof Error ? err.message : "حدث خطأ، حاول مجددًا";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const productId = req.nextUrl.searchParams.get("productId") || "";
    const product = await db.product.findFirst({
      where: { id: productId, storeId: store.id },
    });
    if (!product || !product.videoJobId) {
      return NextResponse.json({ error: "لا توجد مهمة توليد" }, { status: 404 });
    }

    const status = await getVideoAdStatus(product.videoJobId, store.replicateToken);

    if (status.status === "succeeded" && status.videoUrl) {
      await db.product.update({
        where: { id: product.id },
        data: { videoStatus: "ready", videoUrl: status.videoUrl },
      });
    } else if (status.status === "failed") {
      await db.product.update({
        where: { id: product.id },
        data: { videoStatus: "failed" },
      });
    }

    return NextResponse.json({
      status: status.status,
      videoUrl: status.videoUrl,
      error: status.error,
    });
  } catch (err) {
    console.error("video-ads GET error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
