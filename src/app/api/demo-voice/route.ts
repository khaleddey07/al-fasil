import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { transcribeAudio } from "@/lib/asr";
import { withQueue } from "@/lib/queue";
import { parseProductFromText } from "@/lib/ai";
import { suggestThemeForProduct } from "@/lib/lux-themes";

export const maxDuration = 90;

/**
 * العرض الحي في الصفحة الرئيسية (Live Voice Playground)
 * واجهة عامة بحد معدل صارم: نص أو تسجيل صوتي → بيانات منتج + قالب مقترح
 */
export async function POST(req: NextRequest) {
  try {
    // 10 محاولات كل 10 دقائق لكل IP (واجهة عامة)
    const rl = checkRateLimit(`demo-voice:${getClientIp(req)}`, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `محاولات كثيرة، حاول بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة` },
        { status: 429 }
      );
    }

    const body = await req.json();
    let text = typeof body.text === "string" ? body.text.trim() : "";
    const audioBase64 = typeof body.audio === "string" ? body.audio : "";
    const mimeType = String(body.mimeType || "audio/webm");

    if (!text && audioBase64) {
      if (audioBase64.length > 8_000_000) {
        return NextResponse.json({ error: "التسجيل طويل جدًا" }, { status: 400 });
      }
      try {
        text = await withQueue(() => transcribeAudio(audioBase64, mimeType));
      } catch {
        return NextResponse.json(
          { error: "تعذر فهم التسجيل الصوتي، حاول مرة أخرى" },
          { status: 502 }
        );
      }
    }

    if (!text || text.trim().length < 3) {
      return NextResponse.json(
        { error: "اكتب جملة تصف منتجك أو سجّل وصفًا صوتيًا" },
        { status: 400 }
      );
    }

    // تحليل المنتج + اقتراح القالب — عبر الطابور
    const parsed = await withQueue(() => parseProductFromText(text.slice(0, 1200)));
    const suggestedTheme = suggestThemeForProduct(parsed.name, parsed.description).id;

    return NextResponse.json({ transcript: text, parsed, suggestedTheme });
  } catch (err) {
    console.error("demo-voice error:", err);
    const msg =
      err instanceof Error && err.message.includes("JSON")
        ? err.message
        : "تعذر تحليل الوصف، جرّب جملة أوضح";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
