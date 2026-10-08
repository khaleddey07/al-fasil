import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseProductFromText, enhanceProductDescription } from "@/lib/ai";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { withQueue } from "@/lib/queue";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // 20 طلب AI لكل مستخدم كل دقيقة
    const rl = checkRateLimit(`parse:${user.id}:${getClientIp(req)}`, 20, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `طلبات كثيرة، حاول بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const mode = body.mode === "enhance" ? "enhance" : "parse";
    const text = String(body.text || "").trim();

    if (text.length < 3) {
      return NextResponse.json(
        { error: "أدخل وصفًا أطول للمنتج (3 أحرف على الأقل)" },
        { status: 400 }
      );
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: "الوصف طويل جدًا" }, { status: 400 });
    }

    if (mode === "enhance") {
      const name = String(body.name || "").trim() || "منتج";
      // المرور عبر الطابور: مهام الذكاء الاصطناعي الثقيلة لا تُنفَّذ بالتوازي الكامل
      const description = await withQueue(() => enhanceProductDescription(name, text));
      if (!description) {
        return NextResponse.json(
          { error: "تعذر تحسين الوصف، حاول مجددًا" },
          { status: 502 }
        );
      }
      return NextResponse.json({ description });
    }

    const parsed = await withQueue(() => parseProductFromText(text));
    return NextResponse.json({ parsed });
  } catch (err) {
    console.error("parse error:", err);
    const msg =
      err instanceof Error && err.message.includes("JSON")
        ? err.message
        : "تعذر تحليل الوصف، حاول صياغة أخرى";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
