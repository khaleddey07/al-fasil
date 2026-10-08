import { db } from "@/lib/db";

/**
 * نظام كشف الزبناء الوهميين (Blacklist Verification)
 * قاعدة بيانات موحدة على مستوى المنصة تجمع أرقام الزبناء الذين
 * رفضوا استلام طلبياتهم (Retour) أو قدّموا أرقامًا وهمية، فتُنبه
 * التاجر تلقائيًا قبل قبول طلبية جديدة من نفس الرقم.
 */

export interface TrustScore {
  isTrusted: boolean;
  riskLevel: "LOW" | "HIGH";
  reason: string | null;
  failedDeliveries: number;
}

/**
 * توحيد رقم الهاتف للتوحيد الدولي
 * مثال: 0550123456 → 213550123456
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").replace(/^0/, "213");
}

/**
 * فحص درجة ثقة الزبون حسب رقم هاتفه
 */
export async function checkCustomerTrustScore(
  customerPhone: string
): Promise<TrustScore> {
  const normalizedPhone = normalizePhone(customerPhone);

  const blacklistedRecord = await db.blacklistedCustomer.findUnique({
    where: { phone: normalizedPhone },
  });

  if (blacklistedRecord) {
    return {
      isTrusted: false,
      riskLevel: "HIGH",
      reason: `هذا الرقم لديه ${blacklistedRecord.failedDeliveries} طلبية مرجعة (Retour) سابقًا!`,
      failedDeliveries: blacklistedRecord.failedDeliveries,
    };
  }

  return { isTrusted: true, riskLevel: "LOW", reason: null, failedDeliveries: 0 };
}

/**
 * تسجيل رقم في القائمة السوداء (أو زيادة عداد الإرجاع إن كان موجودًا)
 */
export async function reportFailedDelivery(
  customerPhone: string,
  note?: string | null
): Promise<{ phone: string; failedDeliveries: number }> {
  const normalizedPhone = normalizePhone(customerPhone);

  const record = await db.blacklistedCustomer.upsert({
    where: { phone: normalizedPhone },
    create: { phone: normalizedPhone, failedDeliveries: 1, note: note || null },
    update: {
      failedDeliveries: { increment: 1 },
      ...(note ? { note } : {}),
    },
  });

  return { phone: record.phone, failedDeliveries: record.failedDeliveries };
}

/**
 * إزالة رقم من القائمة السوداء (تصحيح خطأ)
 */
export async function removeFromBlacklist(phone: string): Promise<void> {
  const normalizedPhone = normalizePhone(phone);
  await db.blacklistedCustomer.deleteMany({ where: { phone: normalizedPhone } });
}
