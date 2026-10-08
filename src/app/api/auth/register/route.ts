import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createSession, isValidEmail, isValidSlug } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    // حماية من الإساءة: 5 محاولات تسجيل لكل IP كل 10 دقائق
    const rl = checkRateLimit(`register:${getClientIp(req)}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `محاولات كثيرة، حاول بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const storeName = String(body.storeName || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();

    // التحقق من المدخلات
    if (name.length < 2) {
      return NextResponse.json({ error: "الاسم قصير جدًا" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      );
    }
    if (storeName.length < 2) {
      return NextResponse.json({ error: "اسم المتجر قصير جدًا" }, { status: 400 });
    }
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "الرابط غير صالح: 3-30 حرفًا إنجليزيًا صغيرًا وأرقامًا وشرطات" },
        { status: 400 }
      );
    }

    // التحقق من عدم التكرار
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجل مسبقًا" },
        { status: 409 }
      );
    }

    const existingSlug = await db.store.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ error: "هذا الرابط محجوز، اختر رابطًا آخر" }, { status: 409 });
    }

    // إنشاء الحساب والمتجر
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        store: {
          create: { name: storeName, slug },
        },
      },
      include: { store: true },
    });

    await createSession(user.id);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      store: { name: user.store?.name, slug: user.store?.slug },
    });
  } catch (err) {
    console.error("register error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
