import { decryptSecret } from "@/lib/crypto";

/**
 * تأكيد الطلبات التلقائي عبر واتساب (UltraMsg API)
 * عند كل طلبية جديدة يُرسل رابط تأكيد العنوان للزبون،
 * فتقل الطلبيات الوهمية وتُقصَّر دورة التأكيد من مكالمات
 * هاتفية متكررة إلى نقرة واحدة.
 */

export interface WhatsAppOrderInfo {
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  wilayaName: string;
  confirmUrl: string;
}

export function isWhatsAppConfigured(
  instanceEnc: string | null,
  tokenEnc: string | null
): boolean {
  if (!instanceEnc || !tokenEnc) return false;
  return Boolean(decryptSecret(instanceEnc) && decryptSecret(tokenEnc));
}

/**
 * إرسال رسالة تأكيد الطلب عبر واتساب
 * @returns true إذا أُرسلت الرسالة بنجاح
 */
export async function sendOrderConfirmationWhatsApp(
  instanceEnc: string,
  tokenEnc: string,
  toPhone: string,
  order: WhatsAppOrderInfo
): Promise<boolean> {
  const instance = decryptSecret(instanceEnc);
  const token = decryptSecret(tokenEnc);
  if (!instance || !token) return false;

  // UltraMsg يقبل الأرقام الدولية بصيغة 213XXXXXXXXX
  const to = toPhone.replace(/[^0-9]/g, "").replace(/^0/, "213");

  const message = [
    `أهلاً بك ${order.customerName} 👋`,
    `شكراً لطلبك من متجرنا!`,
    "",
    `📦 الطلب: ${order.productName}${order.quantity > 1 ? ` × ${order.quantity}` : ""}`,
    `🧾 رقم الطلبية: ${order.orderNumber}`,
    `📍 الولاية: ${order.wilayaName}`,
    `💰 المبلغ الإجمالي: ${order.totalPrice} دج (الدفع عند الاستلام)`,
    "",
    "يرجى تأكيد عنوان التوصيل بالنقر على الرابط التالي خلال 24 ساعة:",
    `🔗 ${order.confirmUrl}`,
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://api.ultramsg.com/${encodeURIComponent(instance)}/messages/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, to, body: message }).toString(),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    return res.ok;
  } catch {
    // لا نُفشل الطلبية إذا فشل إرسال رسالة واتساب
    return false;
  }
}

/**
 * إشعار التاجر بأن الزبون أكد عنوانه
 */
export async function sendWhatsAppText(
  instanceEnc: string,
  tokenEnc: string,
  toPhone: string,
  message: string
): Promise<boolean> {
  const instance = decryptSecret(instanceEnc);
  const token = decryptSecret(tokenEnc);
  if (!instance || !token) return false;

  const to = toPhone.replace(/[^0-9]/g, "").replace(/^0/, "213");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://api.ultramsg.com/${encodeURIComponent(instance)}/messages/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, to, body: message }).toString(),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
