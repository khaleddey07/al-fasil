import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { aiTranscribe } from "@/lib/ai-gateway";

const execFileAsync = promisify(execFile);

// دليل مؤقت متوافق مع Vercel (القراءة/الكتابة متاحة فقط في /tmp على اللواحق)
const TMP_DIR = path.join(os.tmpdir(), "souq-audio-tmp");

/**
 * تحويل تسجيل صوتي (base64) إلى نص باستخدام ASR
 * يتم تحويل الصوت إلى WAV أحادي 16kHz عبر ffmpeg لأفضل توافق مع خدمة ASR
 */
export async function transcribeAudio(
  base64: string,
  mimeType: string
): Promise<string> {
  const buffer = Buffer.from(base64, "base64");

  // تحديد امتداد الملف من نوع MIME
  let ext = "webm";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) ext = "mp4";
  else if (mimeType.includes("ogg")) ext = "ogg";
  else if (mimeType.includes("wav")) ext = "wav";
  else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) ext = "mp3";

  const id = randomUUID();
  const inputPath = path.join(TMP_DIR, `souq-audio-${id}.${ext}`);
  const outputPath = path.join(TMP_DIR, `souq-audio-${id}.wav`);

  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
    await fs.writeFile(inputPath, buffer);

    // محاولة تحويل الصوت إلى WAV موحد المواصفات
    let finalPath = inputPath;
    try {
      await execFileAsync(
        "ffmpeg",
        ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", "-f", "wav", outputPath],
        { timeout: 30_000 }
      );
      finalPath = outputPath;
    } catch {
      // إذا فشل التحويل نستخدم الملف الأصلي
      finalPath = inputPath;
    }

    const finalBuffer = await fs.readFile(finalPath);
    // بوابة ASR الموحدة: Gemini متعدد الوسائط على الإنتاج (Vercel)، بوابة المنصة محليًا
    // عند توفر WAV المحوّل نمرره بميم audio/wav، وإلا الصوت الأصلي كما سجّله المتصفح
    const finalMime = finalPath === outputPath ? "audio/wav" : mimeType;
    return await aiTranscribe(finalBuffer, finalMime);
  } finally {
    // تنظيف الملفات المؤقتة
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
