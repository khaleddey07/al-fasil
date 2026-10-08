import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/whatsapp";

/**
 * تقرير عمولات المسوق عبر واتساب (Commission Report)
 * POST { affiliateId } → يُرسل للمسوق ملخص أدائه:
 * طلبياته، عمولاته المؤكدة (المُسلّمة)، العمولات المعلّقة، رابط الإحالة الخاص به
 */

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const rl = checkRateLimit(
      `affiliate-report:${user.id}:${getClientIp(req)}`,
      12,
      10 * 60 * 1000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `طلبات كثيرة، حاول بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429 }
      );
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    if (!isWhatsAppConfigured(store.ultramsgInstance, store.ultramsgToken)) {
      return NextResponse.json(
        { error: "اربط مفاتيح واتساب (UltraMsg) من الإعدادات أولًا" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const affiliateId = String(body.affiliateId || "");
    const affiliate = await db.affiliate.findFirst({
      where: { id: affiliateId, storeId: store.id },
    });
    if (!affiliate) {
      return NextResponse.json({ error: "المسوق غير موجود" }, { status: 404 });
    }
    if (!affiliate.phone) {
      return NextResponse.json(
        { error: "لا يوجد رقم هاتف لهذا المسوق — عدّله وأضف رقمه أولًا" },
        { status: 400 }
      );
    }

    // إحصاءات المسوق
    const orders = await db.order.findMany({
      where: { affiliateId: affiliate.id },
      select: { status: true, commission: true },
    });
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
    const pendingOrders = orders.filter((o) =>
      ["NEW", "PROCESSING", "SHIPPED"].includes(o.status)
    ).length;
    const pendingCommission = orders
      .filter((o) => ["NEW", "PROCESSING", "SHIPPED"].includes(o.status))
      .reduce((s, o) => s + o.commission, 0);

    const origin = new URL(req.url).origin;
    const referralLink = `${origin}/?s=${store.slug}&ref=${affiliate.code}`;

    const message = [
      `أهلاً بك ${affiliate.name} 👋`,
      "",
      `📊 *تقرير عمولاتك — متجر ${store.name}*`,
      "",
      `🔗 رمز الإحالة: *${affiliate.code}*`,
      `🧾 إجمالي الطلبيات: *${totalOrders}*`,
      `✅ طلبيات مُسلّمة: *${deliveredOrders}*`,
      `⏳ طلبيات جارية: *${pendingOrders}*`,
      "",
      `💰 العمولات المؤكدة (مدفوعة): *${affiliate.totalEarned.toLocaleString("en-US")} دج*`,
      `⏳ عمولات معلّقة (حتى التسليم): *${pendingCommission.toLocaleString("en-US")} دج*`,
      `📈 نسبتك: *${affiliate.commission}%* على كل طلبية مُسلّمة`,
      "",
      "شارك رابطك أكثر لتزيد أرباحك 🚀",
      `🔗 ${referralLink}`,
      "",
      "— أُرسل من منصة سوقي 🌟",
    ].join("\n");

    const sent = await sendWhatsAppText(
      store.ultramsgInstance as string,
      store.ultramsgToken as string,
      affiliate.phone,
      message
    );

    if (!sent) {
      return NextResponse.json(
        { error: "تعذر الإرسال عبر واتساب — تحقق من مفاتيح UltraMsg ورقم المسوق" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `وصل التقرير إلى ${affiliate.name} على واتساب ✓`,
      stats: { totalOrders, deliveredOrders, pendingOrders, pendingCommission },
    });
  } catch (err) {
    console.error("affiliate report error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
