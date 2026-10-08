import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    // حماية من هجمات التخمين: 10 محاولات لكل IP كل 5 دقائق
    const rl = checkRateLimit(`login:${getClientIp(req)}`, 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `محاولات كثيرة، حاول بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "أدخل البريد الإلكتروني وكلمة المرور" },
        { status: 400 }
      );
    }

    const user = await authenticate(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    await createSession(user.id);
    return NextResponse.json({ user });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
