import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseProductFromText } from "@/lib/ai";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { transcribeAudio } from "@/lib/asr";
import { withQueue } from "@/lib/queue";

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // 15 طلب صوتي لكل مستخدم كل دقيقة
    const rl = checkRateLimit(`parse-voice:${user.id}:${getClientIp(req)}`, 15, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `طلبات كثيرة، حاول بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const audioBase64 = String(body.audio || "");
    const mimeType = String(body.mimeType || "audio/webm");

    if (!audioBase64) {
      return NextResponse.json({ error: "لم يتم إرسال التسجيل الصوتي" }, { status: 400 });
    }

    // حد أقصى للتسجيل: ~8 ميجابايت base64 (≈ 6MB صوت خام)
    if (audioBase64.length > 8_000_000) {
      return NextResponse.json(
        { error: "التسجيل طويل جدًا، سجّل وصفًا أقصر (أقل من دقيقتين)" },
        { status: 400 }
      );
    }

    // 1) تحويل الصوت إلى نص — داخل الطابور لمنع اختناق الخادم
    //    عند ضغط الاستخدام (متطلب الوثيقة: Resilient System Architecture)
    let transcript: string;
    try {
      transcript = await withQueue(() => transcribeAudio(audioBase64, mimeType));
    } catch (err) {
      console.error("ASR error:", err);
      return NextResponse.json(
        { error: "تعذر فهم التسجيل الصوتي، تأكد من وضوح الصوت وحاول مجددًا" },
        { status: 502 }
      );
    }

    if (!transcript || transcript.trim().length < 3) {
      return NextResponse.json(
        { error: "لم يُعرف أي كلام في التسجيل، حاول مرة أخرى بصوت أوضح" },
        { status: 422 }
      );
    }

    // 2) استخراج بيانات المنتج من النص — عبر الطابور أيضًا
    const parsed = await withQueue(() => parseProductFromText(transcript));

    return NextResponse.json({ transcript, parsed });
  } catch (err) {
    console.error("parse-voice error:", err);
    const msg =
      err instanceof Error && err.message.includes("JSON")
        ? err.message
        : "تعذر تحليل التسجيل، حاول مجددًا";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
