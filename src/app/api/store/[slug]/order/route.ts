import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOrderNumber, generateConfirmToken } from "@/lib/crypto";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { getWilayaByCode } from "@/lib/wilayas";
import { sendNewOrderNotification } from "@/lib/telegram";
import { checkCustomerTrustScore } from "@/lib/blacklist";
import { computeCommission } from "@/lib/affiliate";
import { sendOrderConfirmationWhatsApp } from "@/lib/whatsapp";
import type { DeliveryFeeEntry } from "@/lib/souq-types";

type Params = { params: Promise<{ slug: string }> };

/**
 * تقديم طلبية من المتجر العام (بدون حساب)
 * الدفع عند الاستلام
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    // حماية من الإساءة: 8 طلبات لكل IP كل 30 دقيقة
    const rl = checkRateLimit(`order:${getClientIp(req)}`, 8, 30 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `لقد أرسلت العديد من الطلبات، حاول بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` },
        { status: 429 }
      );
    }

    const store = await db.store.findUnique({ where: { slug } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const productId = String(body.productId || "");
    const quantity = Math.floor(Number(body.quantity || 1));
    const selectedOption = body.selectedOption ? String(body.selectedOption) : null;
    const customerName = String(body.customerName || "").trim();
    const customerPhone = String(body.customerPhone || "").replace(/\s/g, "");
    const wilayaCode = Math.floor(Number(body.wilayaCode || 0));
    const commune = String(body.commune || "").trim() || null;
    const address = String(body.address || "").trim() || null;
    const deliveryType = body.deliveryType === "desk" ? "desk" : "home";
    const notes = String(body.notes || "").trim() || null;

    // ————— حماية ضد الرسائل العشوائية (متطلب الوثيقة التقنية) —————
    // 1) حقل الفخ (honeypot): مخفي عن البشر عبر CSS، الروبوتات تعبّئه
    //    تلقائيًا — نرد برقم وهمي يبدو ناجحًا حتى لا يعيد الروبوت المحاولة
    const honeypot = String(body.website || "").trim();
    if (honeypot) {
      return NextResponse.json({
        orderNumber: generateOrderNumber(),
        total: 0,
        deliveryFee: 0,
      });
    }
    // 2) الفخ الزمني: النموذج لا يُملأ بشكل مشروع في أقل من ثانيتين ونصف
    const elapsedMs = Number(body.elapsedMs || 0);
    if (Number.isFinite(elapsedMs) && elapsedMs > 0 && elapsedMs < 2500) {
      return NextResponse.json(
        { error: "أُرسل الطلب بسرعة غير معتادة، أعد المحاولة بعد لحظات" },
        { status: 400 }
      );
    }

    // التحقق من المدخلات
    if (customerName.length < 2) {
      return NextResponse.json({ error: "أدخل الاسم الكامل" }, { status: 400 });
    }
    if (!/^0[5-7][0-9]{8}$/.test(customerPhone)) {
      return NextResponse.json(
        { error: "رقم الهاتف غير صالح (مثال: 0550123456)" },
        { status: 400 }
      );
    }

    const wilaya = getWilayaByCode(wilayaCode);
    if (!wilaya) {
      return NextResponse.json({ error: "اختر الولاية" }, { status: 400 });
    }
    if (deliveryType === "home" && (!address || address.length < 5)) {
      return NextResponse.json(
        { error: "أدخل العنوان الكامل للتوصيل للمنزل" },
        { status: 400 }
      );
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return NextResponse.json({ error: "الكمية غير صالحة" }, { status: 400 });
    }

    // جلب المنتج والتحقق منه
    const product = await db.product.findFirst({
      where: { id: productId, storeId: store.id, isActive: true },
    });
    if (!product) {
      return NextResponse.json({ error: "المنتج غير متوفر" }, { status: 404 });
    }

    // التحقق من الخيار المختار
    if (product.options) {
      try {
        const opts = JSON.parse(product.options) as { name: string; choices: string[] }[];
        if (opts.length > 0) {
          const validChoice = opts.some((o) => o.choices.includes(selectedOption || ""));
          if (!validChoice) {
            return NextResponse.json({ error: "اختر خيارًا للمنتج" }, { status: 400 });
          }
        }
      } catch {
        // تجاهل أخطاء القراءة
      }
    }

    // حساب رسوم التوصيل
    let fees: Record<string, DeliveryFeeEntry> = {};
    try {
      fees = store.deliveryFees ? JSON.parse(store.deliveryFees) : {};
    } catch {
      fees = {};
    }
    const wilayaFee = fees[String(wilayaCode)];
    const deliveryFee =
      deliveryType === "desk"
        ? wilayaFee?.desk ?? store.defaultDeskFee
        : wilayaFee?.home ?? store.defaultHomeFee;

    const total = product.price * quantity + deliveryFee;

    // ————— نظام كشف الزبناء الوهميين (Blacklist Verification) —————
    // نتحقق من درجة ثقة الرقم: القائمة السوداء موحدة على مستوى المنصة
    // (نُعلّم الطلبية بمستوى الخطورة ونُنبه التاجر بدل رفضها — فالقرار للتاجر)
    const trust = await checkCustomerTrustScore(customerPhone);

    // ————— نظام التسويق بالعمولة (Affiliate Attribution) —————
    let affiliateId: string | null = null;
    let commission = 0;
    let affiliateCode: string | null = null;
    const refCode = String(body.refCode || "").trim().toUpperCase();
    if (refCode) {
      const affiliate = await db.affiliate.findFirst({
        where: { code: refCode, storeId: store.id },
      });
      if (affiliate) {
        affiliateId = affiliate.id;
        affiliateCode = affiliate.code;
        commission = computeCommission(product.price * quantity, affiliate.commission);
      }
    }

    // ————— تأكيد العنوان عبر واتساب —————
    const confirmToken = generateConfirmToken();

    // إنشاء الطلبية
    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        storeId: store.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity,
        selectedOption,
        customerName,
        customerPhone,
        wilayaCode,
        wilayaName: wilaya.nameAr,
        commune,
        address,
        deliveryType,
        deliveryFee,
        total,
        status: "NEW",
        notes,
        riskLevel: trust.riskLevel,
        affiliateId,
        commission,
        confirmToken,
      },
    });

    // إشعار التاجر عبر تليجرام (لا يُفشل الطلبية عند الفشل)
    if (store.telegramBotToken && store.telegramChatId) {
      await sendNewOrderNotification(
        store.telegramBotToken,
        store.telegramChatId,
        {
          orderNumber: order.orderNumber,
          storeName: store.name,
          productName: product.name,
          quantity,
          selectedOption,
          customerName,
          customerPhone,
          wilayaCode,
          commune,
          address,
          deliveryType,
          deliveryFee,
          total,
          notes,
          riskLevel: trust.riskLevel,
          riskReason: trust.reason,
          affiliateCode,
        }
      ).catch(() => {});
    }

    // رسالة تأكيد العنوان عبر واتساب (لا تُفشل الطلبية عند الفشل)
    let whatsappSent = false;
    if (store.whatsappEnabled && store.ultramsgInstance && store.ultramsgToken) {
      const origin = new URL(req.url).origin;
      whatsappSent = await sendOrderConfirmationWhatsApp(
        store.ultramsgInstance,
        store.ultramsgToken,
        customerPhone,
        {
          orderNumber: order.orderNumber,
          customerName,
          productName: product.name,
          quantity,
          totalPrice: total,
          wilayaName: wilaya.nameAr,
          confirmUrl: `${origin}/confirm/${confirmToken}`,
        }
      ).catch(() => false);
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      total,
      deliveryFee,
      whatsappSent,
    });
  } catch (err) {
    console.error("store order error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
