import { aiChat } from "@/lib/ai-gateway";

/**
 * كتابة نص المنشور التسويقي بالدارجة الجزائرية عبر الذكاء الاصطناعي
 * (Copywriting IA — Gemini Prompt per مواصفات Social Sync)
 * النص: Accroche + Offre + Call to Action + ذكر 58 ولاية والدفع عند الاستلام + الرابط
 */

export interface SocialPostProduct {
  name: string;
  price: number;
  description: string | null;
  landingUrl: string;
}

export async function generateSocialPostCaption(
  product: SocialPostProduct
): Promise<string> {
  const prompt = `أنت خبير تسويق في الجزائر. اكتب منشورًا احترافيًا وجذابًا للفيسبوك وتيك توك بالدارجة الجزائرية لمنتج:
- اسم المنتج: ${product.name}
- السعر: ${Math.round(product.price)} دج
- الوصف: ${product.description || "منتج فاخر يستحق التجربة"}
- رابط الطلب المباشر: ${product.landingUrl}

الشروط:
1. استخدم إيموجيات جذابة وهيكلة واضحة (Accroche + Offre + Call to Action).
2. اذكر أن التوصيل متوفر لـ 58 ولاية والدفع عند الاستلام.
3. أضف رابط الطلب المباشر في المنتصف وفي النهاية.
4. لا تستخدم مصطلحات تقنية معقدة.
5. طول المنشور بين 5 و 9 أسطر فقط، بدون هاشتاغات كثيرة (3 كحد أقصى).`;

  let caption = "";
  try {
    caption = await aiChat({
      system:
        "أنت كاتب منشورات تسويقية جزائري محترف. تُعيد نص المنشور فقط بدون مقدمات أو تفسيرات أو أسوار Markdown.",
      user: prompt,
      temperature: 0.8,
    });
  } catch {
    // الذكاء الاصطناعي غير متاح؟ نستخدم المنشور الاحتياطي فورًا
    return fallbackCaption(product);
  }

  caption = caption
    .replace(/```[a-z]*\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  // نص احتياطي إن فشل التوليد (لا نُفشل النشر بسبب الذكاء الاصطناعي)
  if (!caption || caption.length < 20) {
    return fallbackCaption(product);
  }
  return caption;
}

/** منشور احتياطي جاهز عند تعذر استدعاء الذكاء الاصطناعي */
export function fallbackCaption(product: SocialPostProduct): string {
  return [
    `✨ ${product.name} — وصل أخيرًا!`,
    "",
    `${product.description?.slice(0, 120) || "جودة عالية وتصميم راقٍ يستحق التجربة."}`,
    "",
    `💰 السعر: ${Math.round(product.price).toLocaleString("en-US")} دج فقط`,
    `🚚 التوصيل متوفر لـ 58 ولاية`,
    `💵 الدفع عند الاستلام — بدون أي مخاطرة`,
    "",
    `🛒 اطلب من هنا: ${product.landingUrl}`,
    "",
    "#الجزائر #تسوق_اونلاين #الدفع_عند_الاستلام",
  ].join("\n");
}
