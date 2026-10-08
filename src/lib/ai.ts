import { aiChat } from "@/lib/ai-gateway";
import { getWilayaByName } from "@/lib/wilayas";

export interface ParsedProduct {
  name: string;
  description: string;
  price: number | null;
  options: { name: string; choices: string[] }[];
}

/**
 * استخراج بيانات المنتج من وصف نصي حر باستخدام الذكاء الاصطناعي
 */
export async function parseProductFromText(text: string): Promise<ParsedProduct> {
  const systemPrompt = `أنت مساعد ذكي متخصص في استخراج بيانات المنتجات للتجارة الإلكترونية في الجزائر.
المهمة: استخرج بيانات المنتج من وصف التاجر (قد يكون عاميًا أو غير مرتب).

أعد النتيجة بصيغة JSON فقط بدون أي نص إضافي، بهذا الشكل تمامًا:
{
  "name": "اسم المنتج موجز وواضح",
  "description": "وصف تسويقي جاذب للمنتج بالعربية من 2 إلى 4 جمل",
  "price": رقم السعر بالدينار الجزائري (استخرجه من النص، وإن لم يوجد ضع null),
  "options": [{"name": "اللون", "choices": ["أحمر", "أزرق"]}]
}

قواعد الخيارات:
- استخرج الخيارات فقط إذا ذُكرت صراحة في النص (مثل: الألوان، المقاسات، السعة...).
- لا تخترع خيارات غير موجودة. إن لم توجد خيارات أعد مصفوفة فارغة [].
- أسماء الخيارات الشائعة: اللون، الحجم/المقاس، السعة، النوع.
- الأسعار عادة تكون بالدينار الجزائري (دج، DA، دينار). إن ذُكر سعر بالأورو/واح هواري حوّله تقريبًا (1 أورو ≈ 145 دج) وضع السعر بالدينار.
- أكتب كل النصوص بالعربية الفصحى المبسطة.`;

  const raw = await aiChat({
    system: systemPrompt,
    user: `وصف التاجر:\n${text}`,
    json: true,
    temperature: 0.4,
  });
  return extractJson(raw);
}

/**
 * تحسين/صياغة وصف منتج من اسم وخصائص مختصرة
 */
export async function enhanceProductDescription(
  name: string,
  hints: string
): Promise<string> {
  return await aiChat({
    system:
      "أنت كاتب محتوى تسويقي للتجارة الإلكترونية. اكتب وصفًا عربيًا جاذبًا وموجزًا (2-4 جمل) للمنتج المحدد، بدون عناوين أو تنسيق Markdown، نص عربي فقط.",
    user: `اسم المنتج: ${name}\nمعلومات إضافية: ${hints || "لا يوجد"}`,
    temperature: 0.7,
  });
}

/**
 * استخراج أول كائن JSON من نص الرد (يتحمل النص المحيط)
 */
function extractJson(raw: string): ParsedProduct {
  let cleaned = raw.trim();

  // إزالة أسوار Markdown إن وجدت
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("تعذر قراءة نتيجة الذكاء الاصطناعي");
  }

  const jsonStr = cleaned.slice(start, end + 1);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    throw new Error("تعذر قراءة نتيجة الذكاء الاصطناعي");
  }

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) throw new Error("لم يتمكن الذكاء الاصطناعي من تحديد اسم المنتج");

  let price: number | null = null;
  if (typeof obj.price === "number" && isFinite(obj.price) && obj.price >= 0) {
    price = Math.round(obj.price);
  } else if (typeof obj.price === "string") {
    const num = parseFloat(obj.price.replace(/[^\d.]/g, ""));
    if (!isNaN(num)) price = Math.round(num);
  }

  // تنظيف الخيارات
  const options: { name: string; choices: string[] }[] = [];
  if (Array.isArray(obj.options)) {
    for (const opt of obj.options) {
      if (
        opt &&
        typeof opt === "object" &&
        typeof (opt as Record<string, unknown>).name === "string" &&
        Array.isArray((opt as Record<string, unknown>).choices)
      ) {
        const optName = ((opt as Record<string, unknown>).name as string).trim();
        const choices = (
          (opt as Record<string, unknown>).choices as unknown[]
        )
          .filter((c) => typeof c === "string" && c.trim())
          .map((c) => (c as string).trim())
          .slice(0, 12);
        if (optName && choices.length >= 2) {
          options.push({ name: optName, choices });
        }
      }
    }
  }

  const description =
    typeof obj.description === "string" ? obj.description.trim() : "";

  return { name, description, price, options };
}

/**
 * محاولة استخراج الولاية من نص حر (للاستخدام المستقبلي)
 */
export function detectWilayaInText(text: string): number | null {
  const wilaya = getWilayaByName(text);
  return wilaya ? wilaya.code : null;
}
