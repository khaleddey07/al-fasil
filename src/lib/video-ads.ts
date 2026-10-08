import { aiChat } from "@/lib/ai-gateway";
import { decryptSecret } from "@/lib/crypto";

/**
 * مولد إعلانات الفيديو القصيرة لـ TikTok/Reels (9:16 Ads Generator)
 * 1) السسكربت التسويقي يُولد بالذكاء الاصطناعي (دارجة جزائرية) دائمًا
 * 2) الفيديو نفسه يُولد من صورة المنتج بمحركين:
 *    - المحرك الافتراضي: بوابة الذكاء الاصطناعي للمنصة (بدون أي مفتاح)
 *    - محرك اختياري: Replicate (Image-to-Video) بمفتاح التاجر (BYOK)
 */

export interface AdScript {
  hook: string; // الخطاف (أول 3 ثوانٍ)
  body: string; // العرض والفوائد
  cta: string; // دعوة للشراء
  fullScript: string; // السسكربت الكامل جاهز للنسخ
}

/**
 * توليد سسكربت إعلان قصير بالدارجة الجزائرية لمنتج ما
 */
export async function generateAdScript(info: {
  name: string;
  description?: string | null;
  price?: number | null;
}): Promise<AdScript> {
  const raw = await aiChat({
    system: `أنت كاتب سسكربتات إعلانات فيديو قصيرة (TikTok/Reels) للسوق الجزائري.
اكتب سسكربت إعلان بالدارجة الجزائرية لمدة 15 ثانية للمنتج المحدد.
أعد النتيجة بصيغة JSON فقط بدون أي نص إضافي:
{
  "hook": "جملة خطاف قوية لأول 3 ثوانٍ (سؤال أو مفاجأة) بالدارجة",
  "body": "عرض الفوائد والميزات في 2-3 جمل دارجة سريعة",
  "cta": "دعوة للشراء مع الإشارة للدفع عند الاستلام والتوصيل 58 ولاية",
  "fullScript": "السسكربت الكامل موحدًا (الخطاف ثم العرض ثم دعوة الشراء) جاهز للقراءة بصوت المعلق"
}
قواعد: دارجة جزائرية طبيعية بلا مبالغة، بدون إيموجي، بدون Markdown، أسعار بالدينار الجزائري إن ذُكرت.`,
    user: `المنتج: ${info.name}\nالوصف: ${info.description || "غير متوفر"}\nالسعر: ${
      info.price ? `${info.price} دج` : "غير متوفر"
    }`,
    json: true,
    temperature: 0.8,
  });

  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("تعذر توليد السسكربت، أعد المحاولة");
  }

  const obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  const hook = typeof obj.hook === "string" ? obj.hook.trim() : "";
  const body = typeof obj.body === "string" ? obj.body.trim() : "";
  const cta = typeof obj.cta === "string" ? obj.cta.trim() : "";
  if (!hook || !body || !cta) throw new Error("تعذر توليد السسكربت، أعد المحاولة");

  const fullScript =
    typeof obj.fullScript === "string" && obj.fullScript.trim()
      ? obj.fullScript.trim()
      : `${hook}\n\n${body}\n\n${cta}`;

  return { hook, body, cta, fullScript };
}

/**
 * بناء Prompt الفيديو (نمط المواصفات: كاميرا سينمائية 9:16)
 * نُبقيه وصفيًا بصريًا بحتًا (تجنب فلاتر المحتوى التسويقية)
 */
export function buildVideoPrompt(productName: string, scriptHook?: string | null): string {
  const subject = productName.slice(0, 60);
  return `Elegant cinematic slow camera pan around a product, luxury commercial studio lighting, smooth motion, dark premium backdrop, ultra high definition, photorealistic, professional e-commerce advertisement. Product: ${subject}`;
}

export interface VideoJob {
  /** "zai:xxx" للمحرك الافتراضي أو UUID خام لـ Replicate */
  jobId: string;
  provider: "zai" | "replicate";
}

/**
 * إطلاق مهمة توليد فيديو من صورة المنتج
 * إن وُجد مفتاح Replicate يُستخدم، وإلا فمحرك المنصة الافتراضي
 */
export async function startVideoAdJob(
  input: { imageUrl: string; videoPrompt: string },
  replicateTokenEnc?: string | null
): Promise<VideoJob> {
  // ————— مسار Replicate (اختياري BYOK) —————
  if (replicateTokenEnc) {
    const token = decryptSecret(replicateTokenEnc);
    if (token) {
      const res = await fetch(
        "https://api.replicate.com/v1/models/minimax/video-01/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Prefer: "respond-async",
          },
          body: JSON.stringify({
            input: {
              prompt: input.videoPrompt,
              first_frame_image: input.imageUrl,
            },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(
          `رفضت Replicate المهمة (${res.status})${
            errText.includes("auth") || res.status === 401
              ? " — تحقق من مفتاح API في الإعدادات"
              : ""
          }`
        );
      }

      const data = (await res.json()) as { id?: string };
      if (!data.id) throw new Error("لم يُرجع Replicate معرّف المهمة");
      return { jobId: data.id, provider: "replicate" };
    }
  }

  // ————— المسار الافتراضي: محرك المنصة (بدون مفتاح) —————
  // على Vercel بوابة المنصة غير متاحة — رسالة واضحة توجّه التاجر لربط Replicate
  let zai;
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    zai = await ZAI.create();
  } catch {
    throw new Error(
      "محرك الفيديو الافتراضي غير متاح على هذا الخادم — اربط مفتاح Replicate من الإعدادات لتوليد الفيديوهات"
    );
  }
  let task;
  try {
    task = await zai.video.generations.create({
      prompt: input.videoPrompt,
      image_url: input.imageUrl,
      quality: "speed",
      with_audio: false,
      size: "720x1280", // عمودي 9:16
      duration: 5,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429") || msg.toLowerCase().includes("too many requests")) {
      throw new Error("خدمة توليد الفيديو مشغولة حاليًا — أعد المحاولة بعد بضع دقائق");
    }
    if (msg.includes("1301") || msg.includes("contentFilter")) {
      throw new Error("رفض المحرك المحتوى (فلتر أمان) — جرب صورة أو نمطًا آخر للمنتج");
    }
    throw err;
  }

  if (!task?.id) throw new Error("تعذر بدء توليد الفيديو، أعد المحاولة");
  return { jobId: `zai:${task.id}`, provider: "zai" };
}

export interface VideoJobStatus {
  status: "starting" | "processing" | "succeeded" | "failed";
  videoUrl: string | null;
  error: string | null;
}

/**
 * متابعة حالة مهمة توليد الفيديو (يتعرف على المحرك من شكل المعرّف)
 */
export async function getVideoAdStatus(
  jobId: string,
  replicateTokenEnc?: string | null
): Promise<VideoJobStatus> {
  // ————— محرك المنصة الافتراضي —————
  if (jobId.startsWith("zai:")) {
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const result = await zai.async.result.query(jobId.slice(4));

      if (result?.task_status === "SUCCESS") {
        const url =
          result.video_result?.[0]?.url ||
          result.video_url ||
          (typeof result.url === "string" ? result.url : null) ||
          (typeof result.video === "string" ? result.video : null);
        if (url) {
          return { status: "succeeded", videoUrl: url, error: null };
        }
        return { status: "failed", videoUrl: null, error: "انتهى التوليد بدون نتيجة" };
      }

      if (result?.task_status === "FAIL") {
        return {
          status: "failed",
          videoUrl: null,
          error: "فشل توليد الفيديو، أعد المحاولة أو جرب صورة أخرى",
        };
      }

      return { status: "processing", videoUrl: null, error: null };
    } catch (err) {
      // ملاحظة: البوابة ترمي خطأ 400 مع جسم JSON فيه task_status=FAIL عند فشل المهمة
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('"task_status":"FAIL"') || msg.includes("1301") || msg.includes("contentFilter")) {
        return {
          status: "failed",
          videoUrl: null,
          error: "رفض المحرك المحتوى (فلتر أمان) — جرب صورة أو نمطًا آخر",
        };
      }
      return { status: "processing", videoUrl: null, error: null };
    }
  }

  // ————— مسار Replicate —————
  if (!replicateTokenEnc) {
    return { status: "failed", videoUrl: null, error: "مفتاح Replicate غير مُعد" };
  }
  const token = decryptSecret(replicateTokenEnc);
  if (!token) {
    return { status: "failed", videoUrl: null, error: "مفتاح Replicate غير مُعد" };
  }

  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: "failed", videoUrl: null, error: `فشل فحص الحالة (${res.status})` };
    }

    const data = (await res.json()) as {
      status: string;
      output?: string | string[];
      error?: string | null;
    };

    if (data.status === "succeeded") {
      const output = Array.isArray(data.output) ? data.output[0] : data.output;
      return {
        status: "succeeded",
        videoUrl: typeof output === "string" ? output : null,
        error: output ? null : "انتهى التوليد بدون نتيجة",
      };
    }

    if (data.status === "failed" || data.status === "canceled") {
      return {
        status: "failed",
        videoUrl: null,
        error: data.error ? String(data.error).slice(0, 200) : "فشل توليد الفيديو",
      };
    }

    return { status: "processing", videoUrl: null, error: null };
  } catch {
    return { status: "processing", videoUrl: null, error: null };
  }
}
