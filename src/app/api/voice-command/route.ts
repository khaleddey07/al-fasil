import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { transcribeAudio } from "@/lib/asr";
import { withQueue } from "@/lib/queue";
import { LUX_THEMES } from "@/lib/lux-themes";

import { aiChat } from "@/lib/ai-gateway";

export const maxDuration = 90;

export interface VoiceCommandIntent {
  action:
    | "set_theme"
    | "set_price"
    | "send_report"
    | "publish_product"
    | "unknown";
  themeSlug: string | null;
  productQuery: string | null;
  price: number | null;
  networks: string[]; // FACEBOOK_PAGE | INSTAGRAM | TIKTOK | TELEGRAM_CHANNEL | WHATSAPP | ALL
  reply: string;
}

/**
 * مركز الأوامر الصوتية: يحوّل كلام التاجر بالدارجة إلى أمر تنفيذي
 * الأمور المدعومة: تغيير قالب المتجر، تعديل سعر منتج، إرسال تقرير المبيعات، نشر منتج على الشبكات
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const rl = checkRateLimit(`voice-command:${user.id}:${getClientIp(req)}`, 12, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `طلبات كثيرة، حاول بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429 }
      );
    }

    const body = await req.json();
    let transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    const audioBase64 = typeof body.audio === "string" ? body.audio : "";
    const mimeType = String(body.mimeType || "audio/webm");

    if (!transcript && audioBase64) {
      if (audioBase64.length > 8_000_000) {
        return NextResponse.json(
          { error: "التسجيل طويل جدًا، سجّل أمرًا أقصر" },
          { status: 400 }
        );
      }
      transcript = await withQueue(() => transcribeAudio(audioBase64, mimeType));
    }

    if (!transcript || transcript.trim().length < 2) {
      return NextResponse.json(
        { error: "لم يتم التعرف على أي أمر، حاول مرة أخرى بصوت أوضح" },
        { status: 422 }
      );
    }

    // بناء قائمة القوالب للمطابقة
    const themeList = LUX_THEMES.map(
      (t) => `- "${t.slug}" (الاسم: ${t.nameAr} / ${t.nameFr}) — القطاع: ${t.idealFor}`
    ).join("\n");

    const systemPrompt = `أنت مساعد أوامر صوتية لمنصة تجارة إلكترونية جزائرية اسمها "سوقي".
التاجر يقول أمره بالدارجة الجزائرية أو العربية. مهمتك: تحديد نية الأمر وإعادة JSON فقط بدون أي نص إضافي.

النوايا المدعومة:
1) "set_theme" — التاجر يريد تغيير تصميم/قالب/ثيم متجره (كلمات: بدل التصميم، غير القالب، حط الثيم، ديزاين...). اختر القالب الأنسب من القائمة التالية حسب القطاع أو الاسم المذكور:
${themeList}
2) "set_price" — التاجر يريد تغيير سعر منتج ("بدل سعر..."، "نقص السعر"، "زيد السعر"...). استخرج اسم المنتج (productQuery) والسعر الجديد بالدينار (price). ضع price فقط إن ذُكر السعر الجديد صراحة، وإلا null.
3) "send_report" — التاجر يريد تقرير مبيعاته على تليجرام ("أرسل التقرير"، "اكتبلي الرابور"...).
4) "publish_product" — التاجر يريد نشر/بارطاج منتج على الشبكات الاجتماعية (كلمات: بارطاجي، بارطاج، انشر، نشر، شارك، بوبليشي...). استخرج:
   - productQuery: اسم المنتج المذكور
   - networks: مصفوفة الشبكات المطلوبة من هذه القيم فقط: "FACEBOOK_PAGE" (فايسبوك/فيسبوك)، "INSTAGRAM" (إنستغرام/إنستا)، "TIKTOK" (تيك توك/تيكتوك)، "TELEGRAM_CHANNEL" (تليجرام/تلغرام)، "WHATSAPP" (واتساب/واتساب). إن قال "الكل" أو "جميع الشبكات" أو لم يحدد شبكة ضع ["ALL"].
5) "unknown" — أي أمر آخر غير مفهوم أو غير مدعوم.

أعد JSON بهذا الشكل تمامًا:
{
  "action": "set_theme" | "set_price" | "send_report" | "publish_product" | "unknown",
  "themeSlug": معرف القالب أو null,
  "productQuery": "اسم المنتج كما ذكره التاجر" أو null,
  "price": رقم أو null,
  "networks": ["FACEBOOK_PAGE", "TIKTOK"] أو null,
  "reply": "رد قصير بالدارجة/العربية (جملة واحدة) يؤكد فهمك للأمر"
}`;

    const raw = await aiChat({
      system: systemPrompt,
      user: `أمر التاجر:\n${transcript}`,
      json: true,
      temperature: 0.3,
    });

    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("تعذر قراءة نتيجة الذكاء الاصطناعي");
    }

    const obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;

    const validActions = [
      "set_theme",
      "set_price",
      "send_report",
      "publish_product",
      "unknown",
    ];
    const action = validActions.includes(String(obj.action))
      ? (String(obj.action) as VoiceCommandIntent["action"])
      : "unknown";

    const themeSlug =
      action === "set_theme" && typeof obj.themeSlug === "string"
        ? LUX_THEMES.find((t) => t.slug === obj.themeSlug)?.slug || null
        : null;

    let price: number | null = null;
    if (action === "set_price") {
      if (typeof obj.price === "number" && isFinite(obj.price) && obj.price >= 0) {
        price = Math.round(obj.price);
      } else if (typeof obj.price === "string") {
        const num = parseFloat(obj.price.replace(/[^\d.]/g, ""));
        if (!isNaN(num)) price = Math.round(num);
      }
    }

    const VALID_NETWORK_CODES = [
      "FACEBOOK_PAGE",
      "INSTAGRAM",
      "TIKTOK",
      "TELEGRAM_CHANNEL",
      "WHATSAPP",
      "ALL",
    ];
    let networks: string[] = [];
    if (action === "publish_product") {
      if (Array.isArray(obj.networks)) {
        networks = obj.networks
          .map((n) => String(n).trim().toUpperCase())
          .filter((n) => VALID_NETWORK_CODES.includes(n));
      }
      if (networks.length === 0) networks = ["ALL"];
    }

    const intent: VoiceCommandIntent = {
      action,
      themeSlug,
      productQuery:
        (action === "set_price" || action === "publish_product") &&
        typeof obj.productQuery === "string"
          ? obj.productQuery.trim()
          : null,
      price,
      networks,
      reply:
        typeof obj.reply === "string" && obj.reply.trim()
          ? obj.reply.trim()
          : "فهمت الأمر",
    };

    if (action === "set_theme" && !themeSlug) {
      intent.action = "unknown";
      intent.reply = "ما عرفتش نحدد القالب، جرب تقول اسم القالب بوضوح";
    }
    if (action === "set_price" && (!intent.productQuery || !price)) {
      intent.action = "unknown";
      intent.reply = "تحتاج نعرف اسم المنتج والسعر الجديد، أعد الأمر بوضوح";
    }
    if (action === "publish_product" && !intent.productQuery) {
      intent.action = "unknown";
      intent.reply = "قول لي شنو المنتج اللي تريد نشره، مثال: بارطاجي العطر في الفايسبوك";
    }

    return NextResponse.json({ transcript, intent });
  } catch (err) {
    console.error("voice-command error:", err);
    return NextResponse.json({ error: "تعذر تنفيذ الأمر، حاول مجددًا" }, { status: 502 });
  }
}
