"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemePreview } from "./theme-preview";
import { getLuxTheme } from "@/lib/lux-themes";
import { haptic, playBlip } from "@/lib/haptics";
import { formatDZD } from "@/lib/souq-types";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Loader2,
  Mic,
  Package,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

type Phase = "idle" | "recording" | "processing" | "done" | "error";

interface DemoResult {
  transcript: string;
  name: string;
  price: number | null;
  themeId: string;
}

const DEMO_PHRASES = [
  "نبي نبيع عطر شرقي فاخر بـ 8500 دج في الجزائر ووهران",
  "قفطان تقليدي مطرز بالذهب بـ 12500 دج",
  "عسل حر طبيعي 100% بـ 4500 دج مع توصيل 58 ولاية",
];

/**
 * العرض الحي الصوتي في الصفحة الرئيسية:
 * التاجر يضغط الزر الذهبي، يتكلم، وفي ثوانٍ يتولّد له متجر فاخر أمام عينيه
 */
export function VoicePlayground() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [resultKey, setResultKey] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef<string>("audio/webm");
  const resultRef = useRef<HTMLDivElement | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mime = candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "";
      mimeRef.current = mime || "audio/webm";

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => void submitAudio();
      recorder.start(250);
      mediaRef.current = recorder;

      haptic([50]);
      playBlip(880);
      setError("");
      setPhase("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      haptic([50, 50, 50]);
      setError("تعذر الوصول إلى الميكروفون — جرّب إحدى الجمل الجاهزة بالأسفل");
      setPhase("error");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
  }

  async function submitAudio() {
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    chunksRef.current = [];
    if (blob.size < 2000) {
      setPhase("idle");
      return;
    }
    setPhase("processing");
    await submit({ audio: await blobToBase64(blob), mimeType: mimeRef.current });
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const r = String(reader.result || "");
        resolve(r.slice(r.indexOf(",") + 1));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function submit(payload: Record<string, string>) {
    setPhase("processing");
    try {
      const res = await fetch("/api/demo-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر التحليل، جرّب مرة أخرى");

      setResult({
        transcript: data.transcript,
        name: data.parsed?.name || "منتج",
        price: typeof data.parsed?.price === "number" ? data.parsed.price : null,
        themeId: data.suggestedTheme || "royal-onyx",
      });
      setResultKey((k) => k + 1);
      playBlip(660);
      haptic([50, 80, 50]);
      setPhase("done");
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، حاول مجددًا");
      setPhase("error");
    }
  }

  const micActive = phase === "recording";
  const theme = result ? getLuxTheme(result.themeId) : null;

  return (
    <div className="w-full">
      {/* الحالة التفاعلية */}
      <div className="flex flex-col items-center gap-4">
        {/* الزر الذهبي الضخم */}
        <div className="relative">
          {micActive && (
            <>
              <span className="absolute inset-0 rounded-full bg-gold/40 animate-ping" />
              <span
                className="absolute inset-0 rounded-full bg-gold/30 animate-ping"
                style={{ animationDelay: "0.4s" }}
              />
            </>
          )}
          <button
            onClick={() => {
              if (phase === "recording") {
                stopRecording();
              } else if (phase === "idle" || phase === "done" || phase === "error") {
                void startRecording();
              }
            }}
            disabled={phase === "processing"}
            aria-label={micActive ? "إيقاف التسجيل" : "جرّب العرض الحي بالصوت"}
            className={cn(
              "relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center outline-none focus-visible:ring-4 focus-visible:ring-gold/50 disabled:opacity-70",
              micActive
                ? "bg-destructive text-white shadow-2xl shadow-destructive/40"
                : "gold-glow-button shadow-2xl"
            )}
          >
            {phase === "processing" ? (
              <Loader2 className="w-9 h-9 animate-spin" />
            ) : micActive ? (
              <X className="w-9 h-9" />
            ) : (
              <Mic className="w-9 h-9 sm:w-10 sm:h-10" />
            )}
          </button>
        </div>

        {/* موجات صوتية أثناء التسجيل */}
        {micActive ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 h-9" aria-hidden>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <span
                  key={i}
                  className="wave-bar w-2 h-9 rounded-full bg-gradient-to-t from-gold-strong to-gold"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <p className="text-xs text-gold/90 font-semibold tabular-nums" dir="ltr">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")} — تكلّم الآن
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/70 text-center max-w-xs leading-relaxed">
            {phase === "processing" ? (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-gold animate-pulse" />
                الذكاء الاصطناعي يبني متجرك...
              </span>
            ) : (
              "اضغط الزر الذهبي وقل ما تريد بيعه — شاهد المتجر يُبنى أمامك"
            )}
          </p>
        )}

        {/* جمل جاهزة للتجربة الفورية */}
        <div className="flex flex-wrap gap-2 justify-center">
          {DEMO_PHRASES.map((p) => (
            <button
              key={p}
              onClick={() => {
                haptic(20);
                void submit({ text: p });
              }}
              disabled={phase === "processing" || phase === "recording"}
              className="rounded-full border border-gold/25 bg-white/[0.06] backdrop-blur-md px-3.5 py-1.5 text-[11.5px] text-white/85 transition-all duration-300 hover:border-gold/60 hover:bg-gold/10 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            >
              {p}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/25 rounded-xl px-3.5 py-2 animate-fade-in">
            {error}
          </p>
        )}
      </div>

      {/* الهاتف ثلاثي الأبعاد مع المتجر المولّد */}
      <div ref={resultRef} className="mt-8 flex justify-center">
        {result && theme ? (
          <div key={resultKey} className="animate-phone-in w-full max-w-[290px]">
            <div className="relative mx-auto">
              {/* إطار الهاتف */}
              <div className="rounded-[2.4rem] border-[7px] border-[#1c1c24] bg-[#0a0a0c] shadow-[0_35px_80px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(212,175,55,0.35)] overflow-hidden">
                {/* شريط علوي */}
                <div className="bg-black px-6 pt-2.5 pb-2 flex justify-center">
                  <span className="w-20 h-4 rounded-full bg-black border border-white/10" />
                </div>

                {/* المتجر المولّد */}
                <div className="relative">
                  <ThemePreview themeId={theme.id} storeName="متجرك الجديد" className="rounded-none" />

                  {/* بطاقة المنتج المولّد تطفو فوق المحاكاة */}
                  <div className="absolute inset-x-3 top-[38%] luxury-glass-card rounded-2xl p-3.5 animate-scale-in">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                        <Package className="w-5.5 h-5.5 text-gold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-[13px] font-bold text-white truncate",
                            theme.styles.fontClass
                          )}
                        >
                          {result.name}
                        </p>
                        {result.price !== null && (
                          <p className="gold-gradient-text font-display font-extrabold text-lg leading-tight">
                            {formatDZD(result.price)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl gold-glow-button py-2 text-center text-xs font-extrabold flex items-center justify-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      اشترِ الآن — الدفع عند الاستلام
                    </div>
                    <div className="mt-2.5 flex items-center justify-center gap-3 text-[9.5px] text-white/60">
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3 text-gold" /> قالب {theme.nameAr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-gold" /> توصيل 58 ولاية
                      </span>
                    </div>
                  </div>
                </div>

                {/* شريط سفلي للهاتف */}
                <div className="bg-black py-2 flex justify-center">
                  <span className="w-16 h-1.5 rounded-full bg-white/25" />
                </div>
              </div>

              {/* توهج سفلي */}
              <div className="absolute -bottom-6 inset-x-8 h-10 rounded-full bg-gold/25 blur-2xl -z-10" />
            </div>

            {/* النص المفهوم */}
            <p className="mt-7 text-center text-xs text-white/55 italic leading-relaxed px-2">
              « {result.transcript.slice(0, 90)}
              {result.transcript.length > 90 ? "…" : ""} »
            </p>
          </div>
        ) : (
          /* هاتف في انتظار العرض */
          <div className="w-full max-w-[290px] opacity-45">
            <div className="rounded-[2.4rem] border-[7px] border-[#1c1c24] bg-[#0a0a0c] shadow-[0_35px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="bg-black px-6 pt-2.5 pb-2 flex justify-center">
                <span className="w-20 h-4 rounded-full bg-black border border-white/10" />
              </div>
              <div className="h-[340px] flex flex-col items-center justify-center gap-3 bg-[#0A0A0C]">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-gold/15 flex items-center justify-center">
                  <Mic className="w-7 h-7 text-gold/40" />
                </div>
                <p className="text-xs text-white/40">شاشة المتجر تظهر هنا</p>
                <p className="text-[10px] text-gold/40">بعد أول تجربة صوتية</p>
              </div>
              <div className="bg-black py-2 flex justify-center">
                <span className="w-16 h-1.5 rounded-full bg-white/25" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
