import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import type { DeliveryFeeEntry } from "@/lib/souq-types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    // فك تشفير مفاتيح تليجرام للتحقق من وجودها (بدون إرسالها للواجهة)
    const hasTelegram = Boolean(
      decryptSecret(store.telegramBotToken || "") &&
        decryptSecret(store.telegramChatId || "")
    );
    const hasWhatsApp = Boolean(
      store.whatsappEnabled &&
        decryptSecret(store.ultramsgInstance || "") &&
        decryptSecret(store.ultramsgToken || "")
    );
    const hasReplicate = Boolean(decryptSecret(store.replicateToken || ""));

    let deliveryFees: Record<string, DeliveryFeeEntry> = {};
    try {
      deliveryFees = store.deliveryFees ? JSON.parse(store.deliveryFees) : {};
    } catch {
      deliveryFees = {};
    }

    return NextResponse.json({
      user,
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        logo: store.logo,
        description: store.description,
        phone: store.phone,
        hasTelegram,
        hasWhatsApp,
        hasReplicate,
        luxTheme: store.luxTheme,
        urgencyEnabled: store.urgencyEnabled,
        urgencyMinutes: store.urgencyMinutes,
        urgencyStock: store.urgencyStock,
        whatsappEnabled: store.whatsappEnabled,
        defaultHomeFee: store.defaultHomeFee,
        defaultDeskFee: store.defaultDeskFee,
        deliveryFees,
      },
    });
  } catch (err) {
    console.error("me error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
