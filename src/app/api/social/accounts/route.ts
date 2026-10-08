import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import type { SocialNetwork } from "@/lib/social-publish";

/**
 * إدارة حسابات الشبكات الاجتماعية (تبويب «الشبكات» — Zero-Tech UX)
 * GET    → قائمة الحسابات المربوطة (المفاتيح مخفية دائمًا)
 * POST   → ربط حساب { network, displayName?, externalId?, accessToken? }
 * DELETE ?id= → فصل حساب
 */

const VALID_NETWORKS = [
  "FACEBOOK_PAGE",
  "INSTAGRAM",
  "TIKTOK",
  "TELEGRAM_CHANNEL",
  "WHATSAPP",
];

function maskId(id: string | null): string | null {
  if (!id) return null;
  return id.length <= 6 ? "•••" : `${id.slice(0, 3)}•••${id.slice(-3)}`;
}

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

    const accounts = await db.socialAccount.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        network: a.network as SocialNetwork,
        displayName: a.displayName,
        externalId: maskId(a.externalId),
        connectedAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("social accounts GET error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const network = String(body.network || "").trim();
    const displayName = String(body.displayName || "").trim() || null;
    const externalId = String(body.externalId || "").trim() || null;
    const accessToken = String(body.accessToken || "").trim() || null;

    if (!VALID_NETWORKS.includes(network)) {
      return NextResponse.json({ error: "شبكة غير معروفة" }, { status: 400 });
    }

    // تليجرام: يكفي معرّف القناة (بوت المتجر من الإعدادات يُستخدم تلقائيًا)
    // واتساب: يكفي رقم/مجموعة الوجهة (مفاتيح UltraMsg من الإعدادات)
    if (network === "TELEGRAM_CHANNEL" && !externalId) {
      return NextResponse.json(
        { error: "أدخل معرّف القناة (@username أو -100...)" },
        { status: 400 }
      );
    }
    if (network === "WHATSAPP" && !externalId) {
      return NextResponse.json(
        { error: "أدخل رقم الوجهة أو معرف المجموعة" },
        { status: 400 }
      );
    }
    if ((network === "FACEBOOK_PAGE" || network === "INSTAGRAM") && !accessToken) {
      return NextResponse.json(
        { error: "أدخل رمز الوصول (Access Token)" },
        { status: 400 }
      );
    }
    if (network === "FACEBOOK_PAGE" && !externalId) {
      return NextResponse.json({ error: "أدخل معرّف الصفحة (Page ID)" }, { status: 400 });
    }
    if (network === "INSTAGRAM" && !externalId) {
      return NextResponse.json(
        { error: "أدخل معرّف حساب إنستغرام الاحترافي (IG User ID)" },
        { status: 400 }
      );
    }

    // حساب واحد لكل شبكة — التحديث يغني عن التكرار
    const existing = await db.socialAccount.findFirst({
      where: { storeId: store.id, network },
    });

    const data = {
      displayName,
      externalId,
      accessToken: accessToken
        ? encryptSecret(accessToken)
        : existing?.accessToken ?? null,
    };

    const account = existing
      ? await db.socialAccount.update({ where: { id: existing.id }, data })
      : await db.socialAccount.create({
          data: { storeId: store.id, network, ...data },
        });

    return NextResponse.json({
      account: {
        id: account.id,
        network: account.network as SocialNetwork,
        displayName: account.displayName,
        externalId: maskId(account.externalId),
        connectedAt: account.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("social accounts POST error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const id = req.nextUrl.searchParams.get("id") || "";
    const account = await db.socialAccount.findFirst({
      where: { id, storeId: store.id },
    });
    if (!account) {
      return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
    }

    await db.socialAccount.delete({ where: { id: account.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("social accounts DELETE error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
