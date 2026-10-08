"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemePreview } from "./theme-preview";
import { getLuxTheme } from "@/lib/lux-themes";
import { haptic, playBlip } from "@/lib/haptics";
import { formatDZD } from "@/lib/souq-types";
import type { ProductDTO } from "@/lib/souq-types";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Check,
  Loader2,
  Mic,
  Package,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";

type Phase = "idle" | "recording" | "processing" | "result" | "done";

interface Intent {
  action:
    | "set_theme"
    | "set_price"
    | "send_report"
    | "publish_product"
    | "unknown";
  themeSlug: string | null;
  productQuery: string | null;
  price: number | null;
  networks: string[];
  reply: string;
}

interface VoiceCommandProps {
  products: ProductDTO[];
  currentTheme: string;
  onThemeApplied: (themeId: string) => void;
  onProductsChanged: () => void;
}

const EXAMPLES = [
  "غيّر التصميم إلى قالب الزليج الأصيل",
  "بدل سعر العطر إلى 8500 دج",
  "أرسل لي تقرير مبيعاتي على تليجرام",
  "بارطاجي العطر في الفايسبوك والتيك توك",
];

const NETWORK_LABELS: Record<string, string> = {
  FACEBOOK_PAGE: "فايسبوك",
  INSTAGRAM: "إنستغرام",
  TIKTOK: "تيك توك",
  TELEGRAM_CHANNEL: "تليجرام",
  WHATSAPP: "واتساب",
  ALL: "جميع الشبكات",
};

/**
 * مركز الأوامر الصوتية — زر ميكro ذهبي عائم يتيح للتاجر قيادة متجره بالدارجة
 */
export function VoiceCommand({
  products,
  currentTheme,
  onThemeApplied,
  onProductsChanged,
}: VoiceCommandProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<ProductDTO | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [executing, setExecuting] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef<string>("audio/webm");

  // تنظيف عند الإغلاق
  useEffect(() => {
    if (!open) {
      stopRecording(true);
      setPhase("idle");
      setTranscript("");
      setIntent(null);
      setMatchedProduct(null);
      setSeconds(0);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      stopRecording(true);
    };
  }, []);

  function startTimer() {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // اختيار أفضل صيغة مدعومة
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
      setPhase("recording");
      startTimer();
    } catch {
      haptic([50, 50, 50]);
      toast({
        title: "تعذر الوصول إلى الميكروفون",
        description: "تحقق من صلاحيات الميكروفون في المتصفح",
        variant: "destructive",
      });
    }
  }

  function stopRecording(silent = false) {
    stopTimer();
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      if (silent) {
        mediaRef.current.onstop = null;
        // إيقاف صامت: نتجاهل النتيجة
        mediaRef.current.ondataavailable = null;
      }
      mediaRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
    if (silent) {
      chunksRef.current = [];
    }
  }

  async function submitAudio() {
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    chunksRef.current = [];
    if (blob.size < 2000) {
      setPhase("idle");
      toast({
        title: "التسجيل قصير جدًا",
        description: "اضغط زر الميكروفون وتحدث بوضوح",
        variant: "destructive",
      });
      return;
    }

    setPhase("processing");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result || "");
          resolve(result.slice(result.indexOf(",") + 1));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch("/api/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, mimeType: mimeRef.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر فهم الأمر");

      setTranscript(data.transcript || "");
      const it: Intent = data.intent;
      setIntent(it);

      // مطابقة المنتج لأمر تغيير السعر أو النشر
      let matched: ProductDTO | null = null;
      if (
        (it.action === "set_price" || it.action === "publish_product") &&
        it.productQuery
      ) {
        const q = it.productQuery.toLowerCase();
        matched =
          products.find((p) => p.name.toLowerCase().includes(q)) ||
          products.find((p) =>
            q.split(/\s+/).some((w) => w.length > 2 && p.name.toLowerCase().includes(w))
          ) ||
          null;
        setMatchedProduct(matched);
        if (!matched) {
          it.action = "unknown";
          it.reply = "ما لقيتش هذا المنتج في متجرك، جرب باسمه كامل";
        }
      }

      playBlip(660);
      haptic(40);
      setPhase("result");

      // التنفيذ التلقائي للآمن
      if (it.action === "set_theme" && it.themeSlug) {
        await applyTheme(it.themeSlug, it.reply);
      } else if (it.action === "send_report") {
        await sendReport(it.reply);
      } else if (it.action === "publish_product" && matched) {
        await publishProduct(matched.id, it);
      }
    } catch (err) {
      toast({
        title: "تعذر تنفيذ الأمر",
        description: err instanceof Error ? err.message : "حاول مجددًا",
        variant: "destructive",
      });
      setPhase("idle");
    }
  }

  async function applyTheme(themeId: string, reply: string) {
    setExecuting(true);
    try {
      const theme = getLuxTheme(themeId);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ luxTheme: themeId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "فشل تطبيق القالب");
      }
      onThemeApplied(themeId);
      haptic([50, 80, 50]);
      setPhase("done");
      toast({
        title: `تم تغيير القالب إلى « ${theme.nameAr} »`,
        description: reply,
      });
    } catch (err) {
      toast({
        title: "تعذر تغيير القالب",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
      setPhase("result");
    } finally {
      setExecuting(false);
    }
  }

  async function sendReport(reply: string) {
    setExecuting(true);
    try {
      const res = await fetch("/api/report", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال التقرير");
      setPhase("done");
      toast({ title: "وصل التقرير إلى تليجرام ✓", description: reply });
    } catch (err) {
      toast({
        title: "تعذر إرسال التقرير",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
      setPhase("result");
    } finally {
      setExecuting(false);
    }
  }

  async function applyPriceChange() {
    if (!matchedProduct || !intent?.price) return;
    setExecuting(true);
    try {
      const res = await fetch(`/api/products/${matchedProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: intent.price }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "فشل تحديث السعر");
      }
      haptic([50, 80, 50]);
      setPhase("done");
      onProductsChanged();
      toast({
        title: "تم تحديث السعر ✓",
        description: `${matchedProduct.name}: ${formatDZD(intent.price)}`,
      });
    } catch (err) {
      toast({
        title: "تعذر تحديث السعر",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  }

  async function publishProduct(productId: string, it: Intent) {
    setExecuting(true);
    try {
      const networks =
        it.networks.includes("ALL") || it.networks.length === 0
          ? [
              "FACEBOOK_PAGE",
              "INSTAGRAM",
              "TIKTOK",
              "TELEGRAM_CHANNEL",
              "WHATSAPP",
            ]
          : it.networks;
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, networks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل النشر");
      const results = (data.results || []) as {
        success: boolean;
        message: string;
      }[];
      const okCount = results.filter((r) => r.success).length;
      const failMsg = results
        .filter((r) => !r.success)
        .map((r) => r.message)
        .join(" · ");
      if (okCount > 0) {
        haptic([50, 80, 50]);
        setPhase("done");
        onProductsChanged();
        toast({
          title: `تم النشر على ${okCount} شبكة ✓`,
          description: failMsg || it.reply,
        });
      } else {
        setPhase("result");
        toast({
          title: "لم يكتمل النشر",
          description: failMsg || "اربط شبكة واحدة على الأقل من تبويب الشبكات",
          variant: "destructive",
        });
      }
    } catch (err) {
      setPhase("result");
      toast({
        title: "تعذر النشر",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  }

  const micActive = phase === "recording";

  return (
    <>
      {/* الزر العائم */}
      <button
        onClick={() => {
          setOpen(true);
          haptic(30);
        }}
        aria-label="مركز الأوامر الصوتية"
        className="fixed bottom-5 left-5 z-40 group outline-none"
      >
        <span className="absolute inset-0 rounded-full bg-gold/40 animate-ping opacity-30 group-hover:opacity-50" />
        <span className="relative w-14 h-14 rounded-full gold-glow-button flex items-center justify-center shadow-2xl">
          <Mic className="w-6 h-6" />
        </span>
        <span className="sr-only">الأوامر الصوتية بالدارجة</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-right flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
                <Mic className="w-4.5 h-4.5 text-gold-strong" />
              </span>
              الأوامر الصوتية
            </DialogTitle>
            <DialogDescription className="text-right">
              قل بالدارجة: غيّر القالب، عدّل سعر منتج، أو أرسل تقرير مبيعاتك على تليجرام
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* منطقة الميكروفون */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative">
                {micActive && (
                  <span className="absolute inset-0 rounded-full bg-gold/50 animate-ping" />
                )}
                <button
                  onClick={() => {
                    if (phase === "recording") {
                      stopRecording();
                    } else if (phase === "idle" || phase === "result" || phase === "done") {
                      setPhase("idle");
                      setIntent(null);
                      setTranscript("");
                      void startRecording();
                    }
                  }}
                  disabled={phase === "processing" || executing}
                  aria-label={micActive ? "إيقاف التسجيل" : "ابدأ التسجيل"}
                  className={cn(
                    "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 outline-none focus-visible:ring-4 focus-visible:ring-gold/40 disabled:opacity-60",
                    micActive
                      ? "bg-destructive text-white shadow-xl shadow-destructive/30 scale-105"
                      : "gold-glow-button"
                  )}
                >
                  {phase === "processing" || executing ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : micActive ? (
                    <X className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              {micActive ? (
                <div className="flex items-center gap-3">
                  {/* موجات صوتية */}
                  <div className="flex items-center gap-1 h-8" aria-hidden>
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <span
                        key={i}
                        className="wave-bar w-1.5 h-8 rounded-full bg-gold"
                        style={{ animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold tabular-nums text-destructive" dir="ltr">
                    {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                    {String(seconds % 60).padStart(2, "0")}
                  </span>
                </div>
              ) : phase === "processing" ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  جارٍ فهم أمرتك بالذكاء الاصطناعي...
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  {phase === "done"
                    ? "تم التنفيذ ✓ — اضغط الميكروفون لأمر جديد"
                    : "اضغط زر الميكروفون وتحدث بوضوح"}
                </p>
              )}
            </div>

            {/* النتيجة */}
            {transcript && phase !== "idle" && (
              <div className="rounded-2xl border border-border/70 bg-muted/50 p-3.5 animate-fade-in">
                <p className="text-[11px] text-muted-foreground mb-1">فهمت:</p>
                <p className="text-sm font-semibold leading-relaxed">« {transcript} »</p>
                {intent && (
                  <p className="text-xs text-gold-strong mt-2 flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {intent.reply}
                  </p>
                )}
              </div>
            )}

            {/* تأكيد تغيير السعر */}
            {intent?.action === "set_price" && matchedProduct && intent.price && (
              <div className="rounded-2xl border border-gold/40 bg-gold-soft p-4 space-y-3 animate-scale-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden shrink-0">
                    {matchedProduct.imageUrl ? (
                      <img
                        src={matchedProduct.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{matchedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDZD(matchedProduct.price)} ←{" "}
                      <span className="font-bold text-gold-strong">
                        {formatDZD(intent.price)}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  onClick={applyPriceChange}
                  disabled={executing}
                  className="w-full gold-glow-button border-0 h-10 rounded-xl gap-1.5"
                >
                  {executing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  تأكيد تغيير السعر
                </Button>
              </div>
            )}

            {/* تأكيد تغيير السعر */}
            {intent?.action === "publish_product" && matchedProduct && (
              <div className="rounded-2xl border border-gold/40 bg-gold-soft p-4 space-y-3 animate-scale-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden shrink-0">
                    {matchedProduct.imageUrl ? (
                      <img
                        src={matchedProduct.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{matchedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">
                      نشر على:{" "}
                      {intent.networks.length > 0
                        ? intent.networks.map((n) => NETWORK_LABELS[n] || n).join("، ")
                        : "جميع الشبكات"}
                    </p>
                  </div>
                </div>
                {executing && (
                  <p className="text-xs text-gold-strong flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    جارٍ توليد البانر والنشر...
                  </p>
                )}
              </div>
            )}

            {/* معاينة القالب عند أمر التغيير */}
            {intent?.action === "set_theme" && intent.themeSlug && (
              <div className="animate-scale-in">
                <ThemePreview
                  themeId={intent.themeSlug}
                  className="max-w-[240px] mx-auto border border-gold/40 shadow-lg"
                />
              </div>
            )}

            {/* أوامر غير مفهومة: أمثلة مساعدة */}
            {(phase === "idle" || intent?.action === "unknown") && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">أمثلة أوامر:</p>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setTranscript(ex);
                      setIntent(null);
                      setPhase("processing");
                      void fetch("/api/voice-command", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ transcript: ex }),
                      })
                        .then(async (res) => {
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "تعذر فهم الأمر");
                          setTranscript(data.transcript || ex);
                          const it: Intent = data.intent;
                          setIntent(it);
                          let matched: ProductDTO | null = null;
                          if (
                            (it.action === "set_price" || it.action === "publish_product") &&
                            it.productQuery
                          ) {
                            const q = it.productQuery.toLowerCase();
                            matched =
                              products.find((p) => p.name.toLowerCase().includes(q)) ||
                              products.find((p) =>
                                q.split(/\s+/).some(
                                  (w) => w.length > 2 && p.name.toLowerCase().includes(w)
                                )
                              ) ||
                              null;
                            setMatchedProduct(matched);
                            if (!matched) {
                              it.action = "unknown";
                            }
                          }
                          if (it.action === "set_theme" && it.themeSlug) {
                            await applyTheme(it.themeSlug, it.reply);
                          } else if (it.action === "send_report") {
                            await sendReport(it.reply);
                          } else if (it.action === "publish_product" && matched) {
                            await publishProduct(matched.id, it);
                          } else {
                            setPhase("result");
                          }
                        })
                        .catch((err) => {
                          toast({
                            title: "تعذر تنفيذ الأمر",
                            description: err instanceof Error ? err.message : "",
                            variant: "destructive",
                          });
                          setPhase("idle");
                        });
                    }}
                    className="w-full text-right rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-[13px] transition-all duration-300 hover:border-gold/40 hover:bg-muted/60 flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Send className="w-3.5 h-3.5 text-gold-strong shrink-0" />
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
