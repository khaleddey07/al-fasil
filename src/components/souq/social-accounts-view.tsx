"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Link2,
  Share2,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import type { SocialAccountDTO, SocialNetworkId } from "@/lib/souq-types";

/**
 * تبويب «الشبكات» — ربط صفحات التاجر بالمنصة بنقرة واحدة (Zero-Tech UX)
 * فايسبوك · إنستغرام · تيك توك · تليجرام · واتساب
 */

interface NetworkMeta {
  id: SocialNetworkId;
  label: string;
  emoji: string;
  hint: string;
  color: string;
  guide: { title: string; steps: string[] };
}

const NETWORKS: NetworkMeta[] = [
  {
    id: "FACEBOOK_PAGE",
    label: "صفحة فايسبوك",
    emoji: "🟦",
    hint: "انشر البانر مع نص البيع على صفحتك مباشرة",
    color: "#1877F2",
    guide: {
      title: "كيف أحصل على معرّف الصفحة والتوكن؟ (دقيقة واحدة)",
      steps: [
        "افتح developers.facebook.com/tools/explorer (المستكشف)",
        "اختر تطبيقك من القائمة العلوية، ثم اضغط «Generate Access Token»",
        "فعّل الصلاحيات: pages_show_list و pages_manage_posts و pages_read_engagement",
        "من خانة الصفحة العلوية اختر صفحتك (وليس حسابك الشخصي)",
        "انسخ التوكن الظاهر والصقه هنا — ومعرّف الصفحة تجده في «حول الصفحة»",
      ],
    },
  },
  {
    id: "INSTAGRAM",
    label: "إنستغرام",
    emoji: "📸",
    hint: "منشور صورة في الفيد — يتطلب حسابًا احترافيًا مرتبطًا بصفحة فايسبوك",
    color: "#E1306C",
    guide: {
      title: "كيف أربط إنستغرام؟",
      steps: [
        "حوّل حسابك في إنستغرام إلى «حساب احترافي» من الإعدادات",
        "اربطه بصفحة فايسبوك من: الإعدادات → الحسابات المركزية",
        "من developers.facebook.com/tools/explorer اختر صلاحيات instagram_content_publish",
        "أحضر معرّف حساب إنستغرام (IG User ID) من /me/accounts",
        "الصق المعرّف والتوكن هنا — أو اربط صفحة فايسبوك أولاً وسنجلبه تلقائيًا",
      ],
    },
  },
  {
    id: "TIKTOK",
    label: "تيك توك",
    emoji: "🖤",
    hint: "منشور صور (Photo Mode) عبر TikTok Content Posting API",
    color: "#25F4EE",
    guide: {
      title: "كيف أحصل على توكن تيك توك؟",
      steps: [
        "أنشئ تطبيقًا على developers.tiktok.com وفعّل صلاحية video.publish",
        "تطبيقك يجب أن يكون معتمدًا (Audited) من تيك توك للنشر العام",
        "ولّد Access Token من صفحة التطبيق وانسخه هنا",
      ],
    },
  },
  {
    id: "TELEGRAM_CHANNEL",
    label: "قناة/مجموعة تليجرام",
    emoji: "✈️",
    hint: "يستعمل بوت متجرك — أضف البوت كمسؤول في القناة ثم الصق المعرّف",
    color: "#26A5E4",
    guide: {
      title: "كيف أنشر في قناتي؟",
      steps: [
        "اربط بوت المتجر أولًا من تبويب «الإعدادات» (التوكن)",
        "أضف البوت في قناتك كمسؤول (Admin) بصلاحية نشر الرسائل",
        "القنوات العامة: المعرّف مثل @my_store_dz",
        "القنوات الخاصة: أضف البوت ثم انسخ المعرّف الرقمي مثل -1001234567890",
      ],
    },
  },
  {
    id: "WHATSAPP",
    label: "واتساب",
    emoji: "🟢",
    hint: "يُرسل البانر + النص إلى رقمك أو مجموعتك عبر UltraMsg",
    color: "#25D366",
    guide: {
      title: "كيف أنشر عبر واتساب؟",
      steps: [
        "اربط مفاتيح UltraMsg من تبويب «الإعدادات» أولًا",
        "للإرسال إلى حالتك أو رقمك: ضع رقمك بصيغة 213XXXXXXXXX",
        "للإرسال إلى مجموعة: أضف رقم المنصة إلى المجموعة وضع معرّفها مثل 213xxxxxxxxx-xxxxxxxxxx@g.us",
      ],
    },
  },
];

export function SocialAccountsView() {
  const [accounts, setAccounts] = useState<SocialAccountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<NetworkMeta | null>(null);
  const [disconnecting, setDisconnecting] = useState<SocialAccountDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // حقول النموذج
  const [externalId, setExternalId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/social/accounts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openConnect(meta: NetworkMeta) {
    haptic(30);
    setExternalId("");
    setAccessToken("");
    setDisplayName("");
    setShowGuide(false);
    setConnecting(meta);
  }

  async function tryOAuth(meta: NetworkMeta) {
    setOauthLoading(true);
    try {
      const res = await fetch("/api/social/facebook/oauth");
      const data = await res.json();
      if (data.available && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      toast({
        title: "الربط بنقرة غير مفعّل بعد",
        description: data.hintAr || "استخدم الربط اليدوي الموجّه",
      });
    } catch {
      toast({ title: "تعذر بدء الربط", variant: "destructive" });
    } finally {
      setOauthLoading(false);
    }
  }

  async function saveAccount() {
    if (!connecting) return;
    setSaving(true);
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: connecting.id,
          displayName: displayName || null,
          externalId: externalId || null,
          accessToken: accessToken || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      haptic([50, 80, 50]);
      toast({
        title: `تم ربط ${connecting.label} ✓`,
        description: "أصبح بإمكانك نشر منتجاتك عليها مباشرة",
      });
      setConnecting(null);
      void load();
    } catch (err) {
      toast({
        title: "تعذر الربط",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDisconnect() {
    if (!disconnecting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/social/accounts?id=${disconnecting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast({ title: `تم فصل ${disconnecting.displayName || "الحساب"}` });
      setDisconnecting(null);
      void load();
    } catch {
      toast({ title: "تعذر الفصل", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  }

  function accountFor(network: SocialNetworkId) {
    return accounts.find((a) => a.network === network) || null;
  }

  return (
    <div className="space-y-5">
      {/* مقدمة Zero-Tech */}
      <div className="rounded-3xl border border-gold/25 bg-gradient-to-l from-gold/10 via-card to-card p-5 sm:p-6 animate-fade-up">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
            <Share2 className="w-5.5 h-5.5 text-gold-strong" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg sm:text-xl">
              حساباتي — انشر على كل الشبكات بنقرة
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              اربط صفحاتك مرة واحدة، وبعدها انشر أي منتج بصورة فاخرة ونص بيع
              جاهز بالدارجة على فيسبوك وإنستغرام وتيك توك وتليجرام وواتساب —
              دون أي إعدادات تقنية.
            </p>
          </div>
        </div>
      </div>

      {/* بطاقات الشبكات */}
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-muted" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-9 bg-muted rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {NETWORKS.map((meta, i) => {
            const account = accountFor(meta.id);
            return (
              <Card
                key={meta.id}
                className={`lift hover:shadow-lift animate-fade-up stagger-${(i % 8) + 1} ${
                  account ? "border-emerald-500/40" : ""
                }`}
              >
                <CardContent className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border"
                        style={{ backgroundColor: `${meta.color}1a`, borderColor: `${meta.color}55` }}
                      >
                        {meta.emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{meta.label}</p>
                        {account?.displayName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {account.displayName}
                          </p>
                        )}
                      </div>
                    </div>
                    {account && (
                      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        مربوط
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed min-h-8">
                    {meta.hint}
                  </p>

                  {account ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl gap-1.5"
                        onClick={() => openConnect(meta)}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        تحديث البيانات
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-destructive/80 hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setDisconnecting(account)}
                        aria-label={`فصل ${meta.label}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full rounded-xl gap-1.5 h-10"
                      style={{ backgroundColor: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}66` }}
                      variant="outline"
                      onClick={() => openConnect(meta)}
                    >
                      <Link2 className="w-4 h-4" />
                      ربط {meta.label}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* نافذة الربط */}
      <Dialog open={!!connecting} onOpenChange={(open) => !open && setConnecting(null)}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-right flex items-center gap-2">
              <span className="text-2xl">{connecting?.emoji}</span>
              ربط {connecting?.label}
            </DialogTitle>
            <DialogDescription className="text-right">
              {connecting?.hint}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* فايسبوك: محاولة OAuth أولًا */}
            {connecting?.id === "FACEBOOK_PAGE" && (
              <Button
                onClick={() => tryOAuth(connecting)}
                disabled={oauthLoading}
                className="w-full h-11 rounded-xl gap-2 text-white border-0"
                style={{ backgroundColor: "#1877F2" }}
              >
                {oauthLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                🔗 ربط صفحة الفايسبوك بنقرة واحدة
              </Button>
            )}
            {connecting?.id === "FACEBOOK_PAGE" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                أو أدخل البيانات يدويًا
                <span className="h-px flex-1 bg-border" />
              </div>
            )}

            {(connecting?.id === "FACEBOOK_PAGE" ||
              connecting?.id === "INSTAGRAM") && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="net-id">
                    {connecting.id === "FACEBOOK_PAGE"
                      ? "معرّف الصفحة (Page ID)"
                      : "معرّف حساب إنستغرام (IG User ID)"}
                  </Label>
                  <Input
                    id="net-id"
                    dir="ltr"
                    placeholder={connecting.id === "FACEBOOK_PAGE" ? "123456789012345" : "17841400000000000"}
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="net-token">رمز الوصول (Access Token) *</Label>
                  <Input
                    id="net-token"
                    dir="ltr"
                    type="password"
                    placeholder="EAAG..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                  />
                </div>
              </>
            )}

            {connecting?.id === "TIKTOK" && (
              <div className="space-y-1.5">
                <Label htmlFor="net-token">Access Token *</Label>
                <Input
                  id="net-token"
                  dir="ltr"
                  type="password"
                  placeholder="act.xxxxx"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>
            )}

            {connecting?.id === "TELEGRAM_CHANNEL" && (
              <div className="space-y-1.5">
                <Label htmlFor="net-id">معرّف القناة *</Label>
                <Input
                  id="net-id"
                  dir="ltr"
                  placeholder="@my_store_dz أو -1001234567890"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                />
              </div>
            )}

            {connecting?.id === "WHATSAPP" && (
              <div className="space-y-1.5">
                <Label htmlFor="net-id">رقم الوجهة أو معرّف المجموعة *</Label>
                <Input
                  id="net-id"
                  dir="ltr"
                  placeholder="213550123456 أو xxx-xxx@g.us"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="net-name">اسم مميز (اختياري)</Label>
              <Input
                id="net-name"
                placeholder="مثال: صفحة المتجر الرسمية"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <Button
              onClick={saveAccount}
              disabled={saving || (!externalId && connecting?.id !== "TIKTOK")}
              className="w-full gold-glow-button border-0 h-11 rounded-xl gap-1.5"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              ربط الحساب
            </Button>

            {/* دليل موجّه */}
            <button
              onClick={() => setShowGuide((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gold-strong hover:underline outline-none"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showGuide ? "إخفاء الدليل" : connecting?.guide.title}
            </button>
            {showGuide && connecting && (
              <ol className="space-y-2 rounded-2xl border border-border/70 bg-muted/50 p-4 text-xs leading-relaxed animate-fade-in">
                {connecting.guide.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-gold/20 text-gold-strong flex items-center justify-center text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* تأكيد الفصل */}
      <AlertDialog
        open={!!disconnecting}
        onOpenChange={(open) => !open && setDisconnecting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>فصل الحساب؟</AlertDialogTitle>
            <AlertDialogDescription>
              لن تتمكن من النشر إلى{" "}
              <b>{disconnecting?.displayName || "هذه الشبكة"}</b> حتى تعيد
              ربطه. لن يتأثر أي منشور سابق.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleteLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDisconnect();
              }}
              disabled={deleteLoading}
              className="bg-destructive text-white hover:bg-destructive/90 gap-2"
            >
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              نعم، افصل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
