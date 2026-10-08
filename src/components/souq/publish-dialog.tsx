"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, Rocket, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { formatDZD } from "@/lib/souq-types";
import type {
  ProductDTO,
  PublishResultDTO,
  SocialAccountDTO,
  SocialNetworkId,
} from "@/lib/souq-types";

/**
 * نافذة النشر السريع — 4 أزرار إجراء أسفل كل منتج (حسب المواصفات):
 * [🟦 فايسبوك] [🖤 تيك توك] [✈️ تليجرام] [🚀 جميع الشبكات]
 * البانر الفاخر + النص بالدارجة يُولدان على الخادم تلقائيًا.
 */

interface NetworkMeta {
  id: SocialNetworkId;
  label: string;
  emoji: string;
  color: string;
}

const NETWORK_META: Record<SocialNetworkId, NetworkMeta> = {
  FACEBOOK_PAGE: { id: "FACEBOOK_PAGE", label: "فايسبوك", emoji: "🟦", color: "#1877F2" },
  INSTAGRAM: { id: "INSTAGRAM", label: "إنستغرام", emoji: "📸", color: "#E1306C" },
  TIKTOK: { id: "TIKTOK", label: "تيك توك", emoji: "🖤", color: "#00C9BE" },
  TELEGRAM_CHANNEL: { id: "TELEGRAM_CHANNEL", label: "تليجرام", emoji: "✈️", color: "#26A5E4" },
  WHATSAPP: { id: "WHATSAPP", label: "واتساب", emoji: "🟢", color: "#25D366" },
};

const ALL_NETWORKS: SocialNetworkId[] = [
  "FACEBOOK_PAGE",
  "INSTAGRAM",
  "TIKTOK",
  "TELEGRAM_CHANNEL",
  "WHATSAPP",
];

const QUICK_BUTTONS: SocialNetworkId[] = [
  "FACEBOOK_PAGE",
  "TIKTOK",
  "TELEGRAM_CHANNEL",
];

interface PublishDialogProps {
  product: ProductDTO | null;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({ product, onOpenChange }: PublishDialogProps) {
  const [accounts, setAccounts] = useState<SocialAccountDTO[]>([]);
  const [publishing, setPublishing] = useState<SocialNetworkId[] | null>(null);
  const [results, setResults] = useState<PublishResultDTO[]>([]);
  const [caption, setCaption] = useState<string>("");

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/social/accounts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
      }
    } catch {
      // تجاهل
    }
  }, []);

  useEffect(() => {
    if (product) {
      setResults([]);
      setCaption("");
      void loadAccounts();
    }
  }, [product, loadAccounts]);

  async function publish(networks: SocialNetworkId[]) {
    if (!product) return;
    setPublishing(networks);
    setResults([]);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, networks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      haptic([50, 80, 50]);
      setResults(data.results || []);
      setCaption(data.caption || "");
      const okCount = (data.results || []).filter((r: PublishResultDTO) => r.success).length;
      if (okCount > 0) {
        toast({
          title: `تم النشر على ${okCount} ${okCount === 1 ? "شبكة" : "شبكات"} ✓`,
          description: product.name,
        });
      }
    } catch (err) {
      toast({
        title: "تعذر النشر",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setPublishing(null);
    }
  }

  function isConnected(network: SocialNetworkId) {
    return accounts.some((a) => a.network === network);
  }

  function labelFor(network: string) {
    return NETWORK_META[network as SocialNetworkId]?.label || network;
  }

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-right flex items-center gap-2.5">
            {product?.imageUrl ? (
              <img
                src={product.imageUrl}
                alt=""
                className="w-11 h-11 rounded-xl object-cover border border-border"
              />
            ) : (
              <span className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-xl">
                🛍️
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate">نشر: {product?.name}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {product ? formatDZD(product.price) : ""}
              </span>
            </span>
          </DialogTitle>
          <DialogDescription className="text-right">
            سيتولى الذكاء الاصطناعي تحويل صورة منتجك إلى بانر فاخر مع السعر
            وشارة «التوصيل لـ 58 ولاية»، وكتابة نص بيع بالدارجة — ثم ينشر فورًا.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* أزرار النشر السريع (المواصفات) */}
          <div className="grid grid-cols-1 gap-2">
            {QUICK_BUTTONS.map((id) => {
              const meta = NETWORK_META[id];
              const connected = isConnected(id);
              const busy = publishing?.length === 1 && publishing?.[0] === id;
              return (
                <Button
                  key={id}
                  disabled={!!publishing || !connected}
                  onClick={() => publish([id])}
                  variant="outline"
                  className="w-full h-11 rounded-xl justify-between gap-2 px-4"
                  style={{ borderColor: `${meta.color}55` }}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="text-base">{meta.emoji}</span>
                    نشر في {meta.label}
                  </span>
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : !connected ? (
                    <span className="text-[10px] text-muted-foreground">غير مربوط</span>
                  ) : null}
                </Button>
              );
            })}
            <Button
              disabled={!!publishing}
              onClick={() => publish(ALL_NETWORKS)}
              className="w-full h-12 gold-glow-button border-0 rounded-xl gap-2 text-base"
            >
              {publishing && publishing.length > 1 ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Rocket className="w-5 h-5" />
              )}
              🚀 نشر في جميع الشبكات (بنقرة واحدة)
            </Button>
          </div>

          {/* النتائج */}
          {results.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/40 p-3.5 animate-fade-in">
              <p className="text-xs font-bold text-muted-foreground">نتيجة النشر:</p>
              {results.map((r) => (
                <div key={r.network} className="flex items-center gap-2 text-sm">
                  {r.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive shrink-0" />
                  )}
                  <span className="font-semibold">{labelFor(r.network)}:</span>
                  <span
                    className={`text-xs ${r.success ? "text-emerald-700" : "text-destructive"}`}
                  >
                    {r.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* معاينة البانر + النص */}
          {product && (
            <details className="group rounded-2xl border border-border/70 overflow-hidden">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold bg-muted/50 flex items-center justify-between">
                معاينة البانر ونص المنشور
                <Badge variant="outline" className="text-[10px]">
                  تلقائي
                </Badge>
              </summary>
              <div className="p-4 space-y-3">
                <img
                  src={`/api/social/banner/${product.id}`}
                  alt={`بانر ${product.name}`}
                  className="w-full rounded-xl border border-gold/20 shadow-md"
                  loading="lazy"
                />
                {caption ? (
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-card rounded-xl border border-border/70 p-3 max-h-48 overflow-y-auto custom-scrollbar">
                    {caption}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    سيظهر نص المنشور هنا بعد أول عملية نشر
                  </p>
                )}
              </div>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
