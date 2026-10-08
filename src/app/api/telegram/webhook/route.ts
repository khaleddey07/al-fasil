import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { handleBotStart } from "@/lib/telegram-bot";

/**
 * Webhook بوت تليجرام التفاعلي (Messaging Mini-Store)
 * يستقبل تحديثات البوت ويجيب على /start بلوحة أزرار تفتح المتجر
 * داخل تلغرام عبر WebApp — مع دعم رمز الإحالة: /start AMINE10
 */

const APP_SECRET =
  process.env.APP_SECRET || "souq-dz-app-secret-key-2026-ecommerce";

/**
 * سر التحقق من اتصالات تليجرام (يرافق setWebhook)
 */
function webhookSecret(slug: string): string {
  return crypto
    .createHmac("sha256", APP_SECRET)
    .update(`tg-webhook:${slug}`)
    .digest("hex")
    .slice(0, 32);
}

export async function POST(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug") || "";
    if (!slug) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // التحقق من أن الطلب قادم فعلًا من تليجرام
    const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (receivedSecret !== webhookSecret(slug)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { slug } });
    if (!store || !store.telegramBotToken) {
      return NextResponse.json({ ok: true }); // نرد 200 حتى لا يعيد تليجرام المحاولة
    }

    const origin = new URL(req.url).origin;
    const update = (await req.json()) as {
      message?: {
        chat?: { id?: number };
        text?: string;
      };
    };

    const message = update.message;
    const chatId = message?.chat?.id ? String(message.chat.id) : null;
    const text = (message?.text || "").trim();

    if (chatId && (text.startsWith("/start") || text.startsWith("/متجر") || text === "/store")) {
      // /start AMINE10 → مرور رمز المسوق إلى واجهة المتجر
      const parts = text.split(/\s+/);
      const refCode = parts[1] ? parts[1].replace(/[^A-Za-z0-9]/g, "").toUpperCase() : null;

      await handleBotStart(
        store.telegramBotToken,
        chatId,
        store.slug,
        store.name,
        origin,
        refCode
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("telegram webhook error:", err);
    // نرد 200 دائمًا حتى لا يعيد تليجرام إرسال التحديث بلا نهاية
    return NextResponse.json({ ok: true });
  }
}
