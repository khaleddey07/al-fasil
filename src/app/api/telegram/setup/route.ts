import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { setBotWebhook } from "@/lib/telegram-bot";

/**
 * تفعيل بوت المتجر التفاعلي — يستدعيه التاجر من الإعدادات
 * يضبط Webhook البوت لدى تليجرام على هذا الخادم
 * POST {} → { ok, description? }
 */
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
    if (!store.telegramBotToken) {
      return NextResponse.json(
        { error: "اربط توكن بوت تليجرام أولًا من قسم الإشعارات" },
        { status: 400 }
      );
    }

    const origin =
      process.env.APP_PUBLIC_URL || new URL(req.url).origin;
    const webhookUrl = `${origin.replace(/\/$/, "")}/api/telegram/webhook?slug=${encodeURIComponent(
      store.slug
    )}`;

    const APP_SECRET =
      process.env.APP_SECRET || "souq-dz-app-secret-key-2026-ecommerce";
    const secret = crypto
      .createHmac("sha256", APP_SECRET)
      .update(`tg-webhook:${store.slug}`)
      .digest("hex")
      .slice(0, 32);

    // setWebhook مع سر التحقق
    const result = await setBotWebhook(store.telegramBotToken, webhookUrl, secret);

    if (!result.ok) {
      return NextResponse.json(
        { error: `فشل تفعيل البوت: ${result.description || "خطأ غير معروف"}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, webhookUrl });
  } catch (err) {
    console.error("telegram setup error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
