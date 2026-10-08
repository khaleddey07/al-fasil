import sharp from "sharp";
import { decryptSecret } from "@/lib/crypto";

/**
 * الناشر التلقائي على الشبكات الاجتماعية (Social Auto-Poster)
 * فيسبوك (Graph API v19.0) · إنستغرام (Content Publishing) · تيك توك (Content Posting)
 * تليجرام (sendPhoto) · واتساب (UltraMsg image)
 * كل ناشر يُعيد نتيجة ودية بالعربية دون إيقاف بقية الشبكات.
 */

export type SocialNetwork =
  | "FACEBOOK_PAGE"
  | "INSTAGRAM"
  | "TIKTOK"
  | "TELEGRAM_CHANNEL"
  | "WHATSAPP";

export interface SocialNetworkMeta {
  id: SocialNetwork;
  labelAr: string;
  emoji: string;
  hintAr: string;
  color: string;
}

export const SOCIAL_NETWORKS: SocialNetworkMeta[] = [
  {
    id: "FACEBOOK_PAGE",
    labelAr: "صفحة فايسبوك",
    emoji: "🟦",
    hintAr: "انشر البانر مع نص البيع على صفحتك مباشرة",
    color: "#1877F2",
  },
  {
    id: "INSTAGRAM",
    labelAr: "إنستغرام",
    emoji: "📸",
    hintAr: "منشور صورة في الفيد عبر حسابك الاحترافي المرتبط بفايسبوك",
    color: "#E1306C",
  },
  {
    id: "TIKTOK",
    labelAr: "تيك توك",
    emoji: "🖤",
    hintAr: "منشور صور (Photo Mode) عبر TikTok Content Posting API",
    color: "#25F4EE",
  },
  {
    id: "TELEGRAM_CHANNEL",
    labelAr: "قناة/مجموعة تليجرام",
    emoji: "✈️",
    hintAr: "يُستخدم بوت المتجر — أضفه كمسؤول في القناة",
    color: "#26A5E4",
  },
  {
    id: "WHATSAPP",
    labelAr: "واتساب",
    emoji: "🟢",
    hintAr: "يُرسل البانر مع النص إلى رقم أو مجموعة عبر UltraMsg",
    color: "#25D366",
  },
];

export type PublishOutcome =
  | { ok: true; externalId?: string }
  | { ok: false; error: string };

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 12_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** تحويل البانر WebP إلى JPEG للمنصات التي لا تضمن دعم WebP (فايسبوك/واتساب) */
async function toJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  } catch {
    return buffer;
  }
}

// ————————————————————————————————————————————————————————————————
// فايسبوك — نشر صورة على صفحة (رفع مباشر multipart، لا يحتاج رابطًا عامًا)
// ————————————————————————————————————————————————————————————————
export async function publishToFacebookPage(params: {
  pageId: string;
  pageAccessToken: string;
  bannerBuffer: Buffer;
  caption: string;
}): Promise<PublishOutcome> {
  try {
    const jpeg = await toJpeg(params.bannerBuffer);
    const form = new FormData();
    form.append("access_token", params.pageAccessToken);
    form.append("caption", params.caption.slice(0, 5000));
    form.append(
      "source",
      new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }),
      "banner.jpg"
    );

    const res = await fetchWithTimeout(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(params.pageId)}/photos`,
      { method: "POST", body: form }
    );
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      post_id?: string;
      error?: { message?: string; code?: number };
    };

    if (res.ok && (data.id || data.post_id)) {
      return { ok: true, externalId: data.post_id || data.id };
    }
    if (data.error?.code === 190) {
      return {
        ok: false,
        error: "توكن فايسبوك منتهي الصلاحية — أعد ربط صفحتك من تبويب الشبكات",
      };
    }
    console.error("facebook publish error:", data.error || res.status);
    return {
      ok: false,
      error: "رفض فايسبوك النشر — تحقق من أن التوكن يملك صلاحية pages_manage_posts",
    };
  } catch (err) {
    console.error("facebook publish exception:", err);
    return { ok: false, error: "تعذر الاتصال بفيسبوك، تحقق من الإنترنت وأعد المحاولة" };
  }
}

// ————————————————————————————————————————————————————————————————
// إنستغرام — منشور صورة عبر الحساب الاحترافي المرتبط (يحتاج رابط صورة عامًا)
// ————————————————————————————————————————————————————————————————
export async function publishToInstagram(params: {
  igUserId: string;
  accessToken: string;
  imageUrl: string; // رابط عام للبانر (JPG)
  caption: string;
}): Promise<PublishOutcome> {
  try {
    const createRes = await fetchWithTimeout(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(params.igUserId)}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: params.imageUrl,
          caption: params.caption.slice(0, 2200),
          access_token: params.accessToken,
        }),
      }
    );
    const created = (await createRes.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string; code?: number };
    };
    if (!createRes.ok || !created.id) {
      if (created.error?.code === 190) {
        return { ok: false, error: "توكن إنستغرام منتهي — أعد ربط الحساب" };
      }
      console.error("instagram create error:", created.error || createRes.status);
      return {
        ok: false,
        error: "تعذر تجهيز المنشور لإنستغرام — تأكد أن الحساب احترافي ومرتبط بصفحة فايسبوك",
      };
    }

    const publishRes = await fetchWithTimeout(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(params.igUserId)}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: created.id,
          access_token: params.accessToken,
        }),
      }
    );
    const published = (await publishRes.json().catch(() => ({}))) as { id?: string };
    if (publishRes.ok && published.id) {
      return { ok: true, externalId: published.id };
    }
    return { ok: false, error: "تجهيز المنشور نجح لكن النشر فشل، حاول مرة أخرى" };
  } catch (err) {
    console.error("instagram publish exception:", err);
    return { ok: false, error: "تعذر الاتصال بإنستغرام، أعد المحاولة" };
  }
}

// ————————————————————————————————————————————————————————————————
// تيك توك — منشور صور عبر Content Posting API (يتطلب تطبيقًا معتمدًا)
// ————————————————————————————————————————————————————————————————
export async function publishToTikTok(params: {
  accessToken: string;
  imageUrl: string; // رابط عام للبانر
  caption: string;
}): Promise<PublishOutcome> {
  try {
    const res = await fetchWithTimeout(
      "https://open.tiktokapis.com/v2/post/publish/content/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: params.caption.slice(0, 2000),
            privacy_level: "PUBLIC_TO_EVERYONE",
          },
          source_info: {
            source: "PULL_FROM_URL",
            photo_cover_from_url: params.imageUrl,
            photo_images: [params.imageUrl],
          },
          post_mode: "DIRECT_POST",
          media_type: "PHOTO",
        }),
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      data?: { publish_id?: string };
      error?: { code?: string; message?: string };
    };
    if (res.ok && data.data?.publish_id) {
      return { ok: true, externalId: data.data.publish_id };
    }
    console.error("tiktok publish error:", data.error || res.status);
    return {
      ok: false,
      error: "تيك توك رفض النشر — تأكد أن تطبيقك المعتمد يملك صلاحية video.publish",
    };
  } catch (err) {
    console.error("tiktok publish exception:", err);
    return { ok: false, error: "تعذر الاتصال بتيك توك، أعد المحاولة" };
  }
}

// ————————————————————————————————————————————————————————————————
// تليجرام — إرسال صورة مع تعليق إلى قناة/مجموعة عبر بوت المتجر
// ————————————————————————————————————————————————————————————————
export async function publishToTelegramChannel(params: {
  botToken: string; // مفكوك مسبقًا (من الحساب أو إعدادات المتجر)
  channelChatId: string; // @username أو -100xxxxxxxxxx
  bannerBuffer: Buffer;
  bannerUrl?: string; // رابط عام إن وُجد — نجرّبه أولًا
  caption: string;
}): Promise<PublishOutcome> {
  const api = (method: string) =>
    `https://api.telegram.org/bot${params.botToken}/${method}`;

  try {
    // المحاولة 1: إرسال بالرابط العام (أسرع وأخف)
    if (params.bannerUrl) {
      const res = await fetchWithTimeout(
        api("sendPhoto"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: params.channelChatId,
            photo: params.bannerUrl,
            caption: params.caption.slice(0, 1024),
            parse_mode: "HTML",
          }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: { message_id?: number };
        description?: string;
      };
      if (res.ok && data.ok && data.result?.message_id) {
        return { ok: true, externalId: String(data.result.message_id) };
      }
      // إن فشل بسبب الرابط نُكمل بالرفع المباشر، غير ذلك نُرجع الخطأ
      const desc = data.description || "";
      if (!/failed to get HTTP URL|wrong file identifier|Bad Request/i.test(desc)) {
        return {
          ok: false,
          error: desc.includes("chat not found")
            ? "لم تُعثر القناة — تأكد من المعرّف وأن البوت مسؤول فيها"
            : desc.includes("bot was blocked")
              ? "البوت محجوب من القناة"
              : "تعذر النشر على تليجرام — تأكد أن البوت مسؤول في القناة",
        };
      }
    }

    // المحاولة 2: رفع الصورة مباشرة multipart
    const jpeg = await toJpeg(params.bannerBuffer);
    const form = new FormData();
    form.append("chat_id", params.channelChatId);
    form.append("caption", params.caption.slice(0, 1024));
    form.append("parse_mode", "HTML");
    form.append(
      "photo",
      new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }),
      "banner.jpg"
    );
    const res2 = await fetchWithTimeout(api("sendPhoto"), {
      method: "POST",
      body: form,
    });
    const data2 = (await res2.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (res2.ok && data2.ok && data2.result?.message_id) {
      return { ok: true, externalId: String(data2.result.message_id) };
    }
    const desc = data2.description || "";
    return {
      ok: false,
      error: desc.includes("chat not found")
        ? "لم تُعثر القناة — تأكد من المعرّف (@username أو -100...) وأن البوت مسؤول فيها"
        : desc.includes("bot was blocked")
          ? "البوت محجوب من القناة"
          : "تعذر النشر على تليجرام — تأكد أن البوت مسؤول في القناة",
    };
  } catch (err) {
    console.error("telegram publish exception:", err);
    return { ok: false, error: "تعذر الاتصال بتليجرام، أعد المحاولة" };
  }
}

// ————————————————————————————————————————————————————————————————
// واتساب — إرسال البانر + النص إلى رقم أو مجموعة عبر UltraMsg
// ————————————————————————————————————————————————————————————————
export async function publishToWhatsApp(params: {
  instance: string; // مفكوك مسبقًا
  token: string; // مفكوك مسبقًا
  to: string; // رقم 213X أو معرف مجموعة xxx@g.us
  bannerBuffer: Buffer;
  caption: string;
}): Promise<PublishOutcome> {
  try {
    const jpeg = await toJpeg(params.bannerBuffer);
    const base64Image = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    const res = await fetchWithTimeout(
      `https://api.ultramsg.com/${encodeURIComponent(params.instance)}/messages/image`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: params.token,
          to: params.to,
          image: base64Image,
          caption: params.caption.slice(0, 1000),
        }).toString(),
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      sent?: string | boolean;
      error?: string;
    };
    if (res.ok && (data.sent === "true" || data.sent === true)) {
      return { ok: true };
    }
    console.error("whatsapp publish error:", data.error || res.status);
    return {
      ok: false,
      error: "تعذر الإرسال عبر واتساب — تحقق من مفاتيح UltraMsg في الإعدادات ومن صيغة الرقم",
    };
  } catch (err) {
    console.error("whatsapp publish exception:", err);
    return { ok: false, error: "تعذر الاتصال بخدمة واتساب، أعد المحاولة" };
  }
}

// ————————————————————————————————————————————————————————————————
// حل بوت تليجرام الفعّال: توكن الحساب أو توكن بوت المتجر
// ————————————————————————————————————————————————————————————————
export function resolveTelegramBotToken(
  accountTokenEncrypted: string | null | undefined,
  storeBotTokenEncrypted: string | null | undefined
): string {
  if (accountTokenEncrypted) {
    const t = decryptSecret(accountTokenEncrypted);
    if (t) return t;
  }
  if (storeBotTokenEncrypted) {
    const t = decryptSecret(storeBotTokenEncrypted);
    if (t) return t;
  }
  return "";
}
