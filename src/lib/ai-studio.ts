import sharp from "sharp";
import { decryptSecret } from "@/lib/crypto";

/**
 * استوديو التصوير الاحترافي بالذكاء الاصطناعي (AI Studio Backgrounds)
 * يعتمد على نموذج تحرير الصور: إزالة الخلفية الأصلية للمنتج وإحلال
 * خلفية استوديو فاخرة مناسبة له (رخام، مخمل ذهبي، إضاءة سينمائية…)
 * دون المساس بشكل المنتج نفسه.
 */

export interface StudioStyle {
  id: string;
  nameAr: string;
  descAr: string;
  /** Prompt التوليد (بالإنجليزية لأن نماذج الصور تفهمها أفضل) */
  prompt: string;
  /** تدرج ألوان للمعاينة في الواجهة */
  gradient: string;
}

export const STUDIO_STYLES: StudioStyle[] = [
  {
    id: "marble_luxury",
    nameAr: "رخام كرارا فاخر",
    descAr: "رخام داكن مصقول مع إضاءة استوديو سينمائية وظلال ناعمة",
    prompt:
      "Place this exact product on dark polished Carrara marble surface as a high-end luxury product shot, cinematic studio lighting, soft shadows, subtle reflection on the marble, 8k resolution, photorealistic commercial photography. Keep the product itself completely unchanged.",
    gradient: "linear-gradient(135deg,#2b2b30,#57545e,#8e8b93)",
  },
  {
    id: "golden_velvet",
    nameAr: "مخمل ذهبي",
    descAr: "خلفية مخمل داكن مع ذرات غبار ذهبي وبقعة ضوء دافئة",
    prompt:
      "Display this exact product on a dark velvet background with subtle floating gold dust particles and a warm golden spotlight from above, luxury product display, photorealistic. Keep the product itself completely unchanged.",
    gradient: "linear-gradient(135deg,#1c1008,#6e4a12,#d4af37)",
  },
  {
    id: "modern_minimal",
    nameAr: "مينيمال عصري",
    descAr: "خلفية خرسانية بلون بيج محايد مع ضوء صباحي ناعم",
    prompt:
      "Minimalist product backdrop for this exact product, neutral beige and warm taupe concrete studio setting, soft morning sunlight, clean modern e-commerce photography. Keep the product itself completely unchanged.",
    gradient: "linear-gradient(135deg,#d9cfc2,#b7a99a,#8d7f70)",
  },
  {
    id: "black_onyx",
    nameAr: "أونيكس ملكي",
    descAr: "صندوق مجوهرات أسود بأسلوب إضاءة العطور والذهب",
    prompt:
      "Luxury jewelry-box style lighting for this exact product, deep black onyx background with elegant rim light and gentle golden accents, premium perfume commercial photography, photorealistic. Keep the product itself completely unchanged.",
    gradient: "linear-gradient(135deg,#0a0a0c,#3a3428,#f5d061)",
  },
  {
    id: "silk_royal",
    nameAr: "حرير ملكي",
    descAr: "قماش حريري متموج بألوان الباستيل الفاخرة",
    prompt:
      "Place this exact product on flowing royal silk fabric with soft waves, elegant pastel luxury tones, gentle diffused studio light, high-end fashion e-commerce photography, photorealistic. Keep the product itself completely unchanged.",
    gradient: "linear-gradient(135deg,#f5eef2,#e8c5c8,#c9a7ab)",
  },
];

export function getStudioStyle(id: string): StudioStyle | undefined {
  return STUDIO_STYLES.find((s) => s.id === id);
}

const DATA_URL_RE = /^data:image\/(?:png|jpe?g|webp|gif|bmp);base64,(.+)$/i;

/**
 * مسار Replicate البديل (BYOK) — يعمل على أي خادم بما فيه Vercel
 * نموذج flux-kontext-pro: تحرير صورة يحافظ على المنتج ويستبدل الخلفية حسب الـ Prompt
 */
async function replicateStudioImage(
  token: string,
  imageDataUrl: string,
  prompt: string
): Promise<Buffer> {
  const res = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait", // انتظار النتيجة مباشرة (تحرير الصورة عادة < 30 ثانية)
      },
      body: JSON.stringify({
        input: {
          prompt,
          image_input: [imageDataUrl],
          output_format: "webp",
          aspect_ratio: "1:1",
        },
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("مفتاح Replicate غير صالح — تحقق منه في الإعدادات");
    }
    if (res.status === 429) {
      throw new Error("خدمة Replicate مشغولة — أعد المحاولة بعد لحظات");
    }
    const errText = await res.text().catch(() => "");
    throw new Error(`تعذر توليد الصورة عبر Replicate (${res.status}) ${errText.slice(0, 120)}`);
  }

  const data = (await res.json()) as { output?: unknown; status?: string; error?: unknown };
  const outputUrl = typeof data.output === "string" ? data.output : null;
  if (!outputUrl) {
    if (data.status === "failed" || data.error) {
      throw new Error("فشل توليد الصورة — جرب صورة منتج أخرى أو نمطًا مختلفًا");
    }
    throw new Error("استغرقت المعالجة وقتًا طويلًا — أعد المحاولة");
  }

  const imgRes = await fetch(outputUrl);
  if (!imgRes.ok) throw new Error("تعذر تحميل الصورة الناتجة");
  return Buffer.from(await imgRes.arrayBuffer());
}

/**
 * توليد صورة استوديو فاخرة من صورة المنتج
 * 1) نرسل الصورة الأصلية إلى نموذج التحرير مع Prompt الخلفية المختارة
 * 2) نعيد ضغط النتيجة (sharp → WebP 80%، 900px) لتناسب شبكات 3G/4G
 * 3) على Vercel: مسار Replicate تلقائيًا عند ربط مفتاح التاجر (BYOK)
 * @returns data URL للصورة الجاهزة
 */
export async function generateLuxuryStudioImage(
  imageDataUrl: string,
  style: StudioStyle,
  replicateTokenEnc?: string | null
): Promise<string> {
  const match = DATA_URL_RE.exec(imageDataUrl);
  if (!match) throw new Error("صورة غير صالحة — ارفع صورة PNG أو JPG");

  // ——— محاولة محرك المنصة أولًا (متاح في بيئة التطوير فقط) ———
  let base64 = "";
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    // ملاحظة: أنواع النسخة المثبتة من SDK تذكر image كنص، لكن بوابة الاستدعاء
    // الفعلية تقبل images كمصفوفة — نمرر وفق الواجهة الفعلية مع تجاوز النوع
    const editBody = {
      prompt: style.prompt,
      images: [{ url: imageDataUrl }],
      size: "1024x1024" as const,
    };

    const response = await zai.images.generations.edit(
      editBody as unknown as Parameters<typeof zai.images.generations.edit>[0]
    );

    base64 = response?.data?.[0]?.base64 || "";
  } catch (platformErr) {
    // المحرك الافتراضي غير متاح (مثلًا على Vercel) → مسار Replicate إن وُجد المفتاح
    if (replicateTokenEnc) {
      const token = decryptSecret(replicateTokenEnc);
      if (token) {
        const buffer = await replicateStudioImage(token, imageDataUrl, style.prompt);
        const output = await sharp(buffer)
          .resize(900, 900, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        return `data:image/webp;base64,${output.toString("base64")}`;
      }
    }
    // لا يوجد مفتاح Replicate: رسالة ودية توجّه التاجر
    if (platformErr instanceof Error && platformErr.message.includes("صورة غير صالحة")) {
      throw platformErr;
    }
    throw new Error(
      "محرك الاستوديو الافتراضي غير متاح على هذا الخادم — اربط مفتاح Replicate من الإعدادات لتفعيل الاستوديو"
    );
  }

  if (!base64) throw new Error("لم يُنتج النموذج صورة، أعد المحاولة");

  // إعادة ضغط النتيجة إلى WebP متوافق مع صفحات المتجر السريعة
  const input = Buffer.from(base64, "base64");
  const output = await sharp(input)
    .resize(900, 900, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  return `data:image/webp;base64,${output.toString("base64")}`;
}
