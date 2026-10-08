import crypto from "crypto";
import { db } from "@/lib/db";

/**
 * نظام التسويق بالعمولة (Affiliate & Referral Engine)
 * كل مسوق يحصل على رمز فريد (مثال: AMINE10) ورابط إحالة شخصي،
 * ويُنسب له الغريم عند تقديم الطلبية، وتُحتسب عمولته عند التسليم.
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بدون أحرف ملتبسة (O/0, I/1)

/**
 * توليد رمز إحالة فريد انطلاقًا من اسم المسوق
 * الرمز لاتيني دائمًا (A-Z0-9) حتى يعمل في الروابط والهواتف
 * مثال: "أمين" → AGENT7K3Q ، "Karim" → KARIM-8F2X
 */
export async function generateAffiliateCode(name: string): Promise<string> {
  // نحافظ على الأحرف اللاتينية والأرقام فقط (الأسماء العربية تتحول للبادئة الافتراضية)
  const prefix = name
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);

  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = Array.from(crypto.randomBytes(4))
      .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
      .join("");
    const code = (prefix.length >= 3 ? prefix : "AGENT") + suffix;

    const exists = await db.affiliate.findUnique({ where: { code } });
    if (!exists) return code;
  }

  // احتياط نظري
  return `AG${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * التحقق من صحة رمز الإحالة (شكلًا)
 */
export function isValidCodeShape(code: string): boolean {
  return /^[A-Z0-9]{4,16}$/.test(code);
}

/**
 * حساب العمولة على الطلبية (على سعر المنتجات فقط، بدون رسوم التوصيل)
 */
export function computeCommission(subtotal: number, commissionPercent: number): number {
  if (!isFinite(commissionPercent) || commissionPercent <= 0) return 0;
  return Math.round((subtotal * Math.min(commissionPercent, 90)) / 100);
}

/**
 * بناء رابط الإحالة الكامل للمسوق
 */
export function buildReferralLink(origin: string, storeSlug: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/?s=${storeSlug}&ref=${code}`;
}
