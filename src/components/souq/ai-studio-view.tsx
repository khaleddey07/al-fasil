"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDZD } from "@/lib/souq-types";
import type { ProductDTO } from "@/lib/souq-types";
import { toast } from "@/hooks/use-toast";
import {
  Sparkles,
  Wand2,
  Loader2,
  ImageIcon,
  Film,
  Copy,
  Clapperboard,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface AiStudioViewProps {
  products: ProductDTO[];
  loading: boolean;
  hasReplicateKey: boolean;
  onProductsChanged: () => void;
}

interface StudioStyleOption {
  id: string;
  nameAr: string;
  descAr: string;
  gradient: string;
}

/** نفس أنماط الخلفيات المعرفة في lib/ai-studio.ts */
const STYLES: StudioStyleOption[] = [
  {
    id: "marble_luxury",
    nameAr: "رخام كرارا فاخر",
    descAr: "رخام داكن مصقول وإضاءة سينمائية",
    gradient: "linear-gradient(135deg,#2b2b30,#57545e,#8e8b93)",
  },
  {
    id: "golden_velvet",
    nameAr: "مخمل ذهبي",
    descAr: "مخمل داكن وغبار ذهبي",
    gradient: "linear-gradient(135deg,#1c1008,#6e4a12,#d4af37)",
  },
  {
    id: "modern_minimal",
    nameAr: "مينيمال عصري",
    descAr: "بيج محايد وضوء صباحي ناعم",
    gradient: "linear-gradient(135deg,#d9cfc2,#b7a99a,#8d7f70)",
  },
  {
    id: "black_onyx",
    nameAr: "أونيكس ملكي",
    descAr: "أسود عميق بإضاءة المجوهرات",
    gradient: "linear-gradient(135deg,#0a0a0c,#3a3428,#f5d061)",
  },
  {
    id: "silk_royal",
    nameAr: "حرير ملكي",
    descAr: "حرير متموج بألوان الباستيل",
    gradient: "linear-gradient(135deg,#f5eef2,#e8c5c8,#c9a7ab)",
  },
];

/**
 * استوديو AI: خلفيات تصوير فاخرة بالذكاء الاصطناعي + إعلانات فيديو 9:16
 */
export function AiStudioView({
  products,
  loading,
  hasReplicateKey,
  onProductsChanged,
}: AiStudioViewProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [styleId, setStyleId] = useState<string>("marble_luxury");
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [scriptLoading, setScriptLoading] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>("none");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = products.find((p) => p.id === selectedId) || null;

  // إعادة ضبط الحالة عند تغيير المنتج المختار
  useEffect(() => {
    setResultUrl(null);
    setScript(selected?.videoScript || null);
    setVideoStatus(selected?.videoStatus || "none");
    setVideoUrl(selected?.videoUrl || null);
  }, [selectedId]);

  // تنظيف مؤقّت المتابعة
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleGenerate() {
    if (!selected) {
      toast({ title: "اختر منتجًا أولًا", variant: "destructive" });
      return;
    }
    const sourceUrl = resultUrl || selected.imageUrl;
    if (!sourceUrl) {
      toast({
        title: "المنتج بدون صورة",
        description: "أضف صورة للمنتج من صفحة المنتجات أولًا",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/ai-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selected.id, imageUrl: sourceUrl, style: styleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر توليد الصورة");

      setResultUrl(data.imageUrl);
      setPreviewUrl(data.imageUrl);
      onProductsChanged();
      toast({
        title: "تم توليد صورة الاستوديو الفاخرة",
        description: "طُبقت على المنتج مباشرة",
      });
    } catch (err) {
      toast({
        title: "فشل التوليد",
        description: err instanceof Error ? err.message : "حاول مجددًا",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateVideo() {
    if (!selected) {
      toast({ title: "اختر منتجًا أولًا", variant: "destructive" });
      return;
    }

    setScriptLoading(true);
    try {
      const res = await fetch("/api/video-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر توليد الإعلان");

      setScript(data.script?.fullScript || null);
      onProductsChanged();

      if (data.videoStarted) {
        setVideoStatus("pending");
        toast({
          title: "بدأ توليد الفيديو 9:16",
          description: "التوليد يستغرق دقائق — سنتابع حالته تلقائيًا",
        });
        startPolling(selected.id);
      } else if (data.videoError) {
        toast({
          title: "السسكربت جاهز",
          description: data.videoError,
        });
      }
    } catch (err) {
      toast({
        title: "فشل التوليد",
        description: err instanceof Error ? err.message : "حاول مجددًا",
        variant: "destructive",
      });
    } finally {
      setScriptLoading(false);
    }
  }

  const startPolling = useCallback(
    (productId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/video-ads?productId=${productId}`, {
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.status === "succeeded" && data.videoUrl) {
            setVideoStatus("ready");
            setVideoUrl(data.videoUrl);
            onProductsChanged();
            toast({ title: "الفيديو جاهز! 🎬" });
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (data.status === "failed") {
            setVideoStatus("failed");
            toast({
              title: "فشل توليد الفيديو",
              description: data.error || "أعد المحاولة",
              variant: "destructive",
            });
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {
          // تجاهل أخطاء الشبكة المؤقتة
        }
      }, 10_000);
    },
    [onProductsChanged]
  );

  function copyScript() {
    if (!script) return;
    navigator.clipboard.writeText(script).then(() => {
      toast({ title: "تم نسخ السسكربت", description: "الصقه في وصف الفيديو على TikTok" });
    });
  }

  const withImage = products.filter((p) => p.imageUrl);

  return (
    <div className="space-y-6">
      {/* الترويسة */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-gold" />
            استوديو الذكاء الاصطناعي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            صور استوديو فاخرة وإعلانات فيديو 9:16 لـ TikTok/Reels — بدون مصور
          </p>
        </div>
        {!hasReplicateKey && (
          <Badge variant="outline" className="gap-1.5 text-[11px] py-1.5 px-3">
            <Sparkles className="w-3 h-3" />
            توليد الفيديو يعمل بمحرك المنصة — ويمكن ربط Replicate من الإعدادات
          </Badge>
        )}
      </div>

      {/* اختيار المنتج */}
      <Card className="border-border/70 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            1. اختر المنتج
          </CardTitle>
          <CardDescription>
            {withImage.length} منتجًا بصورة جاهزة للتوليد
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              أضف منتجات أولًا من تبويب المنتجات
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 max-h-72 overflow-y-auto custom-scrollbar p-1">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-right ${
                    selectedId === p.id
                      ? "border-gold shadow-lg shadow-gold/20 scale-[1.02]"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  <div className="aspect-square bg-muted">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-medium px-2 py-1.5 truncate bg-card">
                    {p.name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* استوديو الصور */}
      <Card className="border-border/70 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            2. خلفية الاستوديو الفاخرة
          </CardTitle>
          <CardDescription>
            إزالة الخلفية الأصلية واستبدالها بإضاءة ورخام ومخمل احترافي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyleId(s.id)}
                className={`rounded-2xl overflow-hidden border-2 transition-all duration-300 text-right ${
                  styleId === s.id
                    ? "border-gold shadow-md shadow-gold/20"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="h-12" style={{ background: s.gradient }} />
                <div className="px-2.5 py-2 bg-card">
                  <p className="text-xs font-bold truncate">{s.nameAr}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.descAr}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating || !selected}
              className="gap-2 rounded-xl bg-gradient-to-l from-primary to-deep border-0 shadow-md shadow-primary/25"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generating ? "جارٍ التوليد (10-30 ثانية)..." : "توليد الصورة الفاخرة"}
            </Button>
            {selected && (
              <p className="text-xs text-muted-foreground">
                المختار: <span className="font-semibold text-foreground">{selected.name}</span>
              </p>
            )}
          </div>

          {/* قبل/بعد */}
          {(selected?.imageUrl || previewUrl) && (
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                  الأصلية
                </p>
                <div className="aspect-square rounded-2xl overflow-hidden border border-border/60 bg-muted">
                  {selected?.imageUrl ? (
                    <img src={selected.imageUrl} alt="أصلية" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gold mb-1.5">
                  النتيجة الفاخرة
                </p>
                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-gold/50 bg-muted relative">
                  {generating ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted/50">
                      <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="نتيجة" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* إعلانات الفيديو */}
      <Card className="border-border/70 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-primary" />
            3. إعلان فيديو قصير (TikTok / Reels — 9:16)
          </CardTitle>
          <CardDescription>
            سسكربت دارجة بالذكاء الاصطناعي + فيديو سينمائي من صورة المنتج
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleGenerateVideo}
              disabled={scriptLoading || !selected}
              variant="outline"
              className="gap-2 rounded-xl border-gold/40 hover:bg-gold/10"
            >
              {scriptLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Film className="w-4 h-4" />
              )}
              {scriptLoading ? "جارٍ الكتابة..." : "توليد السسكربت والفيديو"}
            </Button>
            {videoStatus === "pending" && (
              <Badge className="gap-1.5 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                <RefreshCw className="w-3 h-3 animate-spin" />
                الفيديو قيد التوليد...
              </Badge>
            )}
            {videoStatus === "ready" && (
              <Badge className="gap-1.5 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                <CheckCircle2 className="w-3 h-3" />
                جاهز — يظهر في المتجر
              </Badge>
            )}
            {videoStatus === "failed" && (
              <Badge className="gap-1.5 bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100">
                <XCircle className="w-3 h-3" />
                فشل التوليد
              </Badge>
            )}
          </div>

          {script && (
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground">
                  السسكربت الإعلاني (دارجة)
                </p>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={copyScript}>
                  <Copy className="w-3 h-3" />
                  نسخ
                </Button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{script}</p>
            </div>
          )}

          {videoUrl && (
            <div className="max-w-[240px] mx-auto rounded-3xl overflow-hidden border-2 border-gold/40 shadow-lg">
              <video
                src={videoUrl}
                controls
                playsInline
                className="w-full aspect-[9/16] bg-black"
                preload="metadata"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
