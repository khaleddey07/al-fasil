/**
 * بوابة الذكاء الاصطناعي الموحدة (AI Gateway)
 * ————————————————————————————————————————————
 * طبقة تجريد واحدة لكل استدعاءات الذكاء الاصطناعي في المنصة:
 *
 * 1) على خادم منصة التطوير (البيئة الحالية): بوابة z-ai-web-dev-sdk — بدون أي مفتاح
 * 2) على Vercel أو أي خادم إنتاج: Google Gemini 1.5 Flash عبر REST
 *    (كما هو محدد في وثيقة SRS — Voice-Driven E-Commerce Engine)
 *    يكفي تعيين GEMINI_API_KEY في متغيرات البيئة وسيتحول كل شيء تلقائيًا.
 *
 * الملفات المعتمدة على هذه البوابة:
 *   ai.ts (تحليل منتج) | asr.ts (تفريغ صوتي) | social-copywriting.ts
 *   video-ads.ts (سسكربت) | voice-command (نية الأمر)
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** هل بوابة Gemini مهيأة؟ (وضع الإنتاج / Vercel) */
export function hasGeminiKey(): boolean {
  return GEMINI_API_KEY.length > 0;
}

export interface AiChatOptions {
  /** تعليمات النظام (الشخصية/القواعد) */
  system: string;
  /** رسالة المستخدم */
  user: string;
  /** فرض إخراج JSON صالح */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  /** مهلة بالمللي ثانية (افتراضي 60 ثانية) */
  timeoutMs?: number;
}

async function geminiChat(opts: AiChatOptions): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.system }] },
          contents: [{ role: "user", parts: [{ text: opts.user }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.7,
            ...(opts.json ? { responseMimeType: "application/json" } : {}),
            ...(opts.maxOutputTokens
              ? { maxOutputTokens: opts.maxOutputTokens }
              : {}),
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 429) {
        throw new Error("خدمة الذكاء الاصطناعي مشغولة — أعد المحاولة بعد لحظات");
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("مفتاح GEMINI_API_KEY غير صالح أو منتهي");
      }
      throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || "").join("").trim();
    if (!text) throw new Error("رد فارغ من Gemini");
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("استغرقت معالجة الذكاء الاصطناعي وقتًا طويلًا — أعد المحاولة");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** استدعاء بوابة المنصة (بيئة التطوير) مع رسالة واضحة إن لم تكن متاحة */
async function sandboxChat(opts: AiChatOptions): Promise<string> {
  let zai;
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    zai = await ZAI.create();
  } catch {
    throw new Error(
      "خدمة الذكاء الاصطناعي غير مهيأة على هذا الخادم — أضف GEMINI_API_KEY في متغيرات البيئة"
    );
  }
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: opts.system },
      { role: "user", content: opts.user },
    ],
    thinking: { type: "disabled" },
  });
  return (completion.choices[0]?.message?.content || "").trim();
}

/** استدعاء نصي موحد: Gemini على الإنتاج، بوابة المنصة في بيئة التطوير */
export async function aiChat(opts: AiChatOptions): Promise<string> {
  // ——— الإنتاج: Gemini 1.5 Flash (SRS §Stack) ———
  if (hasGeminiKey()) return geminiChat(opts);

  // ——— بيئة التطوير: بوابة المنصة ———
  return sandboxChat(opts);
}

/**
 * تفريغ صوتي موحد (ASR)
 * - الإنتاج: Gemini 1.5 Flash متعدد الوسائط يقبل الصوت مباشرة (inlineData)
 *   بدون ffmpeg — يستقبل webm/ogg/mp4/wav كما سجّله المتصفح.
 * - التطوير: بوابة المنصة (zai.audio.asr).
 * @param buffer بيانات الصوت
 * @param mimeType نوع الصوت الأصلي
 */
export async function aiTranscribe(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (hasGeminiKey()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55_000);
    try {
      const res = await fetch(
        `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: "Transcris fidèlement cet audio en arabe (dialecte algérien accepté). Réponds UNIQUEMENT avec la transcription, sans commentaire ni ponctuation ajoutée.",
                  },
                  {
                    inlineData: {
                      mimeType: mimeType || "audio/webm",
                      data: buffer.toString("base64"),
                    },
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.1 },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        if (res.status === 429) {
          throw new Error("خدمة التفريغ الصوتي مشغولة — أعد المحاولة");
        }
        throw new Error(`Gemini ASR ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const parts = data.candidates?.[0]?.content?.parts || [];
      return parts
        .map((p) => p.text || "")
        .join("")
        .trim();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("الصوت طويل — سجّل أمرًا أقصر");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ——— بيئة التطوير ———
  let zai;
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    zai = await ZAI.create();
  } catch {
    throw new Error(
      "خدمة التفريغ الصوتي غير مهيأة على هذا الخادم — أضف GEMINI_API_KEY في متغيرات البيئة"
    );
  }
  const response = await zai.audio.asr.create({
    file_base64: buffer.toString("base64"),
  });
  return response.text || "";
}
