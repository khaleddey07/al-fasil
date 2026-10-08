import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/crypto";
import { getWilayaByName, getWilayaByCode } from "@/lib/wilayas";
import { sendNewOrderNotification } from "@/lib/telegram";
import { checkCustomerTrustScore } from "@/lib/blacklist";
import type { DeliveryFeeEntry } from "@/lib/souq-types";

/**
 * التقاط الطلبيات تلقائيًا من فايسبوك (Lead Ads Webhooks)
 * GET  → تحقق من الـWebhook (hub.challenge)
 * POST → استقبال leadgen → جلب بيانات الزبون من Graph API
 *        → إنشاء طلبية (source=FACEBOOK_LEAD_AD) → إشعار تليجرام فوري
 */

async function fetchLeadDetails(
  leadId: string,
  pageAccessToken: string
): Promise<{ fieldData: { name: string; values: string[] }[] } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(leadId)}?access_token=${encodeURIComponent(pageAccessToken)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      field_data?: { name: string; values: string[] }[];
    };
    return { fieldData: data.field_data || [] };
  } catch {
    return null;
  }
}

/** استخراج رقم هاتف جزائري صالح من قيم النموذج */
function extractPhone(values: string[]): string | null {
  for (const v of values) {
    const digits = v.replace(/[^0-9]/g, "");
    // 0550123456 أو 213550123456 أو 2130550123456
    const m = digits.match(/^(?:213)?0?([5-7][0-9]{8})$/);
    if (m) return `0${m[1]}`;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.FB_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  // فايسبوك يتطلب ردًا سريعًا 200 — المعالجة داخل try دائمًا
  try {
    const body = await req.json();

    if (body.object !== "page") {
      return NextResponse.json({ status: "ignored" });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const leadId: string | undefined = change.value?.leadgen_id;
        const pageId: string | undefined = change.value?.page_id;
        if (!leadId || !pageId) continue;

        // 1) تحديد المتجر عبر الصفحة المربوطة
        const account = await db.socialAccount.findFirst({
          where: { network: "FACEBOOK_PAGE", externalId: pageId },
          include: { store: true },
        });
        if (!account || !account.accessToken) {
          console.error("fb-lead: no store bound to page", pageId);
          continue;
        }
        const store = account.store;

        // 2) فك توكن الصفحة وجلب بيانات الزبون
        const { decryptSecret } = await import("@/lib/crypto");
        const pageToken = decryptSecret(account.accessToken);
        if (!pageToken) continue;

        const lead = await fetchLeadDetails(leadId, pageToken);
        if (!lead || lead.fieldData.length === 0) {
          console.error("fb-lead: cannot fetch lead", leadId);
          continue;
        }

        // 3) استخراج الحقول (اسم/هاتف + بحث عن ولاية ومنتج في الأسئلة المخصصة)
        const fields = lead.fieldData;
        const nameField = fields.find((f) =>
          /^(full_name|name|الاسم|الاسم_الكامل)$/i.test(f.name)
        );
        const phoneField = fields.find((f) =>
          /^(phone_number|phone|الهاتف|الهاتف_الجوال)$/i.test(f.name)
        );

        const allValues = fields.flatMap((f) => f.values || []);
        const customerName = nameField?.values?.[0] || "زبون فايسبوك";
        const customerPhone = extractPhone(
          phoneField?.values || allValues
        );

        if (!customerPhone) {
          console.error("fb-lead: no valid phone in lead", leadId);
          continue;
        }

        // ولاية: أول قيمة تُطابق اسم ولاية جزائرية
        let wilayaCode = 16; // الجزائر افتراضيًا
        let wilayaName = "الجزائر";
        for (const v of allValues) {
          const w = getWilayaByName(v);
          if (w) {
            wilayaCode = w.code;
            wilayaName = w.nameAr;
            break;
          }
        }

        // منتج: أول قيمة تُطابق منتجًا في المتجر
        const products = await db.product.findMany({
          where: { storeId: store.id, isActive: true },
        });
        let matched: (typeof products)[number] | null =
          products.find((p) =>
            allValues.some((v) => v.trim() && p.name.includes(v.trim()))
          ) ||
          products.find((p) =>
            allValues.some(
              (v) =>
                v.trim().length > 2 &&
                p.name.toLowerCase().includes(v.trim().toLowerCase())
            )
          ) ||
          null;
        const leadProductName =
          fields.find((f) => /(product|المنتج|المنتوج)/i.test(f.name))?.values?.[0] || null;

        // منتج احتياطي مخفي لطلبيات فايسبوك بدون منتج مطابق
        if (!matched) {
          matched = await db.product.findFirst({
            where: { storeId: store.id, isActive: false, name: "طلبيات فايسبوك" },
          });
          if (!matched) {
            matched = await db.product.create({
              data: {
                storeId: store.id,
                name: "طلبيات فايسبوك",
                description: "منتج افتراضي لالتقاط الطلبيات القادمة من إعلانات فايسبوك",
                price: 0,
                isActive: false,
              },
            });
          }
        }

        // 4) حساب الرسوم والإجمالي (السعر من المنتج المطابق، الكمية 1)
        let fees: Record<string, DeliveryFeeEntry> = {};
        try {
          fees = store.deliveryFees ? JSON.parse(store.deliveryFees) : {};
        } catch {
          fees = {};
        }
        const wilayaFee = fees[String(wilayaCode)];
        const deliveryFee = wilayaFee?.home ?? store.defaultHomeFee;
        const quantity = 1;
        const total = matched.price * quantity + deliveryFee;

        // 5) فحص الثقة + إنشاء الطلبية
        const trust = await checkCustomerTrustScore(customerPhone);
        const order = await db.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            storeId: store.id,
            productId: matched.id,
            productName: matched.name,
            unitPrice: matched.price,
            quantity,
            customerName,
            customerPhone,
            wilayaCode,
            wilayaName,
            deliveryType: "home",
            deliveryFee,
            total,
            status: "NEW",
            riskLevel: trust.riskLevel,
            source: "FACEBOOK_LEAD_AD",
            notes: leadProductName
              ? `منتج مذكور في إعلان فايسبوك: ${leadProductName}`
              : "طلبية قادمة تلقائيًا من فايسبوك (Lead Ad)",
          },
        });

        // 6) إشعار تليجرام فوري للتاجر
        if (store.telegramBotToken && store.telegramChatId) {
          const wilaya = getWilayaByCode(wilayaCode);
          await sendNewOrderNotification(
            store.telegramBotToken,
            store.telegramChatId,
            {
              orderNumber: order.orderNumber,
              storeName: store.name,
              productName: matched.name,
              quantity,
              customerName,
              customerPhone,
              wilayaCode: wilaya?.code ?? wilayaCode,
              deliveryType: "home",
              deliveryFee,
              total,
              notes: "طلبية تلقائية من فايسبوك",
              riskLevel: trust.riskLevel,
              riskReason: trust.reason,
            }
          ).catch(() => {});
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (err) {
    console.error("facebook-leads webhook error:", err);
    // نُعيد 200 دائمًا حتى لا يعيد فايسبوك الإرسال بلا نهاية
    return NextResponse.json({ status: "success" });
  }
}
