import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isValidSlug } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { optimizeStoreLogo } from "@/lib/images";
import type { DeliveryFeeEntry } from "@/lib/souq-types";
import { LUX_THEME_IDS } from "@/lib/lux-themes";

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    // اسم المتجر
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return NextResponse.json({ error: "اسم المتجر قصير جدًا" }, { status: 400 });
      }
      data.name = name;
    }

    // الرابط (Slug)
    if (body.slug !== undefined) {
      const slug = String(body.slug).trim().toLowerCase();
      if (!isValidSlug(slug)) {
        return NextResponse.json(
          { error: "الرابط غير صالح: 3-30 حرفًا إنجليزيًا صغيرًا وأرقامًا وشرطات" },
          { status: 400 }
        );
      }
      if (slug !== store.slug) {
        const existing = await db.store.findUnique({ where: { slug } });
        if (existing) {
          return NextResponse.json({ error: "هذا الرابط محجوز" }, { status: 409 });
        }
      }
      data.slug = slug;
    }

    // الشعار والوصف والهاتف
    if (body.logo !== undefined) {
      let logo = body.logo === null ? null : String(body.logo);
      // نسمح بشعارات أكبر عند الرفع لأن الخادم يعيد ضغطها (sharp → WebP 80%)
      if (logo && logo.length > 3_000_000) {
        return NextResponse.json({ error: "حجم الشعار كبير جدًا" }, { status: 400 });
      }
      if (logo) {
        logo = await optimizeStoreLogo(logo);
        if (logo.length > 500_000) {
          return NextResponse.json({ error: "الشعار ثقيل جدًا، جرب صورة أبسط" }, { status: 400 });
        }
      }
      data.logo = logo;
    }
    if (body.description !== undefined) {
      data.description = body.description === null ? null : String(body.description).trim() || null;
    }
    if (body.phone !== undefined) {
      data.phone = String(body.phone).trim() || null;
    }

    // إعدادات تليجرام (تُخزن مشفرة)
    if (body.telegramBotToken !== undefined) {
      const token = String(body.telegramBotToken).trim();
      data.telegramBotToken = token ? encryptSecret(token) : null;
    }
    if (body.telegramChatId !== undefined) {
      const chatId = String(body.telegramChatId).trim();
      data.telegramChatId = chatId ? encryptSecret(chatId) : null;
    }

    // قالب Lux (تصميم المتجر العام)
    if (body.luxTheme !== undefined) {
      const themeId = String(body.luxTheme).trim();
      if (!LUX_THEME_IDS.includes(themeId)) {
        return NextResponse.json({ error: "قالب التصميم غير معروف" }, { status: 400 });
      }
      data.luxTheme = themeId;
    }

    // عداد الاستعجال والندرة (Urgency & Scarcity)
    if (body.urgencyEnabled !== undefined) {
      data.urgencyEnabled = Boolean(body.urgencyEnabled);
    }
    if (body.urgencyMinutes !== undefined) {
      const minutes = Math.floor(Number(body.urgencyMinutes));
      if (isNaN(minutes) || minutes < 5 || minutes > 1440) {
        return NextResponse.json(
          { error: "مدة العد التنازلي يجب أن تكون بين 5 و 1440 دقيقة" },
          { status: 400 }
        );
      }
      data.urgencyMinutes = minutes;
    }
    if (body.urgencyStock !== undefined) {
      const stock = Math.floor(Number(body.urgencyStock));
      if (isNaN(stock) || stock < 1 || stock > 99) {
        return NextResponse.json(
          { error: "الكمية المعلنة يجب أن تكون بين 1 و 99" },
          { status: 400 }
        );
      }
      data.urgencyStock = stock;
    }

    // واتساب — تأكيد العنوان التلقائي (UltraMsg، تُخزن مشفرة)
    if (body.whatsappEnabled !== undefined) {
      data.whatsappEnabled = Boolean(body.whatsappEnabled);
    }
    if (body.ultramsgInstance !== undefined) {
      const val = String(body.ultramsgInstance).trim();
      data.ultramsgInstance = val ? encryptSecret(val) : null;
    }
    if (body.ultramsgToken !== undefined) {
      const val = String(body.ultramsgToken).trim();
      data.ultramsgToken = val ? encryptSecret(val) : null;
    }

    // مفتاح Replicate لتوليد إعلانات الفيديو (BYOK، مشفر)
    if (body.replicateToken !== undefined) {
      const val = String(body.replicateToken).trim();
      data.replicateToken = val ? encryptSecret(val) : null;
    }

    // رسوم التوصيل
    if (body.defaultHomeFee !== undefined) {
      const fee = Number(body.defaultHomeFee);
      if (isNaN(fee) || fee < 0) {
        return NextResponse.json({ error: "رسوم التوصيل غير صالحة" }, { status: 400 });
      }
      data.defaultHomeFee = fee;
    }
    if (body.defaultDeskFee !== undefined) {
      const fee = Number(body.defaultDeskFee);
      if (isNaN(fee) || fee < 0) {
        return NextResponse.json({ error: "رسوم التوصيل غير صالحة" }, { status: 400 });
      }
      data.defaultDeskFee = fee;
    }
    if (body.deliveryFees !== undefined) {
      const fees = body.deliveryFees || {};
      const clean: Record<string, DeliveryFeeEntry> = {};
      for (const [code, entry] of Object.entries(fees)) {
        const e = entry as Partial<DeliveryFeeEntry>;
        const home = Number(e.home);
        const desk = Number(e.desk);
        if (!isNaN(home) && !isNaN(desk) && home >= 0 && desk >= 0) {
          clean[code] = { home, desk };
        }
      }
      data.deliveryFees = JSON.stringify(clean);
    }

    const updated = await db.store.update({ where: { id: store.id }, data });

    return NextResponse.json({
      store: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logo: updated.logo,
        description: updated.description,
        phone: updated.phone,
        defaultHomeFee: updated.defaultHomeFee,
        defaultDeskFee: updated.defaultDeskFee,
      },
    });
  } catch (err) {
    console.error("settings error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
