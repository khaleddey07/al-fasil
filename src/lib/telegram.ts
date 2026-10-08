import { decryptSecret } from "@/lib/crypto";
import { getWilayaByCode } from "@/lib/wilayas";

export interface TelegramOrderInfo {
  orderNumber: string;
  storeName: string;
  productName: string;
  quantity: number;
  selectedOption?: string | null;
  customerName: string;
  customerPhone: string;
  wilayaCode: number;
  commune?: string | null;
  address?: string | null;
  deliveryType: string;
  deliveryFee: number;
  total: number;
  notes?: string | null;
  riskLevel?: "LOW" | "HIGH" | null;
  riskReason?: string | null;
  affiliateCode?: string | null;
}

/**
 * إرسال إشعار طلب جديد إلى تليجرام التاجر
 * @returns true إذا أُرسلت الرسالة بنجاح
 */
export async function sendNewOrderNotification(
  botTokenEncrypted: string,
  chatIdEncrypted: string,
  order: TelegramOrderInfo
): Promise<boolean> {
  const botToken = decryptSecret(botTokenEncrypted);
  const chatId = decryptSecret(chatIdEncrypted);

  if (!botToken || !chatId) return false;

  const wilaya = getWilayaByCode(order.wilayaCode);
  const deliveryLabel =
    order.deliveryType === "desk" ? "مكتب التوصيل (Stop Desk)" : "التوصيل للمنزل";

  const lines = [
    "🔔 *طلب جديد!*",
    "",
    `📦 الطلبية: \`${order.orderNumber}\``,
    `🏪 المتجر: ${order.storeName}`,
    "",
    "🛍 *المنتج:*",
    `${order.productName} × ${order.quantity}`,
  ];

  if (order.selectedOption) {
    lines.push(`⚙️ الخيار: ${order.selectedOption}`);
  }

  // تحذير الزبون الوهمي (نظام كشف الثقة)
  if (order.riskLevel === "HIGH") {
    lines.push(
      "",
      "⚠️ *تنبيه: زبون عالي الخطورة!*",
      order.riskReason || "هذا الرقم له طلبيات مرجعة سابقاً"
    );
  }

  if (order.affiliateCode) {
    lines.push("", `📣 المسوّق: *${order.affiliateCode}*`);
  }

  lines.push(
    "",
    "👤 *الزبون:*",
    `الاسم: ${order.customerName}`,
    `الهاتف: \`${order.customerPhone}\``,
    `الولاية: ${wilaya ? `${wilaya.nameAr} (${wilaya.code})` : order.wilayaCode}`
  );

  if (order.commune) lines.push(`البلدية: ${order.commune}`);
  if (order.address) lines.push(`العنوان: ${order.address}`);

  lines.push(
    `نوع التوصيل: ${deliveryLabel}`,
    "",
    `🚚 رسوم التوصيل: ${order.deliveryFee} دج`,
    `💰 *الإجمالي: ${order.total} دج*`,
    "💵 الدفع عند الاستلام"
  );

  if (order.notes) lines.push("", `📝 ملاحظات: ${order.notes}`);

  const text = lines.join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    return res.ok;
  } catch {
    // لا نُفشل الطلبية إذا فشل إرسال الإشعار
    return false;
  }
}

export interface SalesReportData {
  storeName: string;
  totalOrders: number;
  newOrders: number;
  deliveredRevenue: number;
  pipelineRevenue: number;
  topProduct: string | null;
  topWilaya: string | null;
  period: string;
}

/**
 * إرسال تقرير المبيعات إلى تليجرام التاجر
 */
export async function sendSalesReport(
  botTokenEncrypted: string,
  chatIdEncrypted: string,
  report: SalesReportData
): Promise<boolean> {
  const botToken = decryptSecret(botTokenEncrypted);
  const chatId = decryptSecret(chatIdEncrypted);

  if (!botToken || !chatId) return false;

  const lines = [
    "📊 *تقرير المبيعات*",
    `🏪 ${report.storeName}`,
    `🗓 ${report.period}`,
    "",
    `🧾 إجمالي الطلبيات: *${report.totalOrders}*`,
    `🔔 طلبيات جديدة بانتظار المعالجة: *${report.newOrders}*`,
    `💰 مبيعات مُسلّمة: *${report.deliveredRevenue} دج*`,
    `⏳ طلبيات جارية: *${report.pipelineRevenue} دج*`,
  ];

  if (report.topProduct) lines.push(`🏆 المنتج الأكثر طلبًا: ${report.topProduct}`);
  if (report.topWilaya) lines.push(`📍 الولاية الأكثر طلبًا: ${report.topWilaya}`);

  lines.push("", "— أُرسل من منصة سوقي 🌟");

  const text = lines.join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
