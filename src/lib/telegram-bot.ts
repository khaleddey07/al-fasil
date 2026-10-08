import { decryptSecret } from "@/lib/crypto";

/**
 * المتاجر التفاعلية عبر التلغرام (Messaging Mini-Stores)
 * بوت تلغرام يرد على /start بلوحة أزرار داخلية (Inline Keyboard)
 * تفتح واجهة المتجر مباشرة داخل تلغرام عبر Telegram WebApp،
 * ويستقبل رمز الإحالة من /start AMINE10 لتتبع مبيعات المسوقين.
 */

const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "";

/**
 * استخراج رابط المتجر العام من ترويسات الطلب (لأغراض WebApp URL)
 */
export function resolveOrigin(headers: Headers): string {
  if (APP_PUBLIC_URL) return APP_PUBLIC_URL.replace(/\/$/, "");
  const proto = headers.get("x-forwarded-proto") || "https";
  const host = headers.get("x-forwarded-host") || headers.get("host") || "";
  return `${proto}://${host}`;
}

/**
 * رد على أمر /start من الزبون: تحية + زر تصفح المتجر داخل تلغرام
 */
export async function handleBotStart(
  botTokenEnc: string,
  chatId: string,
  storeSlug: string,
  storeName: string,
  origin: string,
  refCode?: string | null
): Promise<boolean> {
  const botToken = decryptSecret(botTokenEnc);
  if (!botToken) return false;

  const storeUrl = refCode
    ? `${origin}/?s=${storeSlug}&ref=${encodeURIComponent(refCode)}`
    : `${origin}/?s=${storeSlug}`;

  const text = [
    `مرحباً بك في المحل الرقمي ${storeName}! 🛍️`,
    "",
    "يمكنك تصفح المنتجات والشراء مباشرة دون مغادرة تلغرام:",
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [
            [{ text: "تصفح المتجر الفاخر ✨", web_app: { url: storeUrl } }],
            [{ text: "فتح في المتصفح 🌐", url: storeUrl }],
          ],
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * تفعيل Webhook البوت لدى Telegram (يستدعيه التاجر من الإعدادات)
 */
export async function setBotWebhook(
  botTokenEnc: string,
  webhookUrl: string,
  secretToken?: string
): Promise<{ ok: boolean; description?: string }> {
  const botToken = decryptSecret(botTokenEnc);
  if (!botToken) return { ok: false, description: "توكن البوت غير مُعد" };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        ...(secretToken ? { secret_token: secretToken } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
    };
    return { ok: Boolean(data.ok), description: data.description };
  } catch {
    return { ok: false, description: "تعذر الاتصال بتليجرام" };
  }
}
