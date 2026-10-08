"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ImagePicker } from "./image-picker";
import { Switch } from "@/components/ui/switch";
import { WILAYAS } from "@/lib/wilayas";
import type { DeliveryFeeEntry, MeDTO } from "@/lib/souq-types";
import {
  Loader2,
  Save,
  Copy,
  ExternalLink,
  Send,
  RotateCcw,
  Store as StoreIcon,
  Truck,
  BellRing,
  CheckCircle2,
  Timer,
  MessageCircle,
  Clapperboard,
  Bot,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SettingsViewProps {
  me: MeDTO;
  onUpdated: (me: MeDTO) => void;
}

interface WilayaFeeRow {
  code: number;
  nameAr: string;
  home: string;
  desk: string;
}

export function SettingsView({ me, onUpdated }: SettingsViewProps) {
  const [name, setName] = useState(me.store.name);
  const [slug, setSlug] = useState(me.store.slug);
  const [description, setDescription] = useState(me.store.description || "");
  const [phone, setPhone] = useState(me.store.phone || "");
  const [logo, setLogo] = useState<string | null>(me.store.logo);
  const [defaultHomeFee, setDefaultHomeFee] = useState(String(me.store.defaultHomeFee));
  const [defaultDeskFee, setDefaultDeskFee] = useState(String(me.store.defaultDeskFee));
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  // عداد الاستعجال والندرة
  const [urgencyEnabled, setUrgencyEnabled] = useState(me.store.urgencyEnabled);
  const [urgencyMinutes, setUrgencyMinutes] = useState(String(me.store.urgencyMinutes));
  const [urgencyStock, setUrgencyStock] = useState(String(me.store.urgencyStock));
  // واتساب (UltraMsg)
  const [whatsappEnabled, setWhatsappEnabled] = useState(me.store.whatsappEnabled);
  const [ultramsgInstance, setUltramsgInstance] = useState("");
  const [ultramsgToken, setUltramsgToken] = useState("");
  // مفتاح Replicate لتوليد الفيديو
  const [replicateToken, setReplicateToken] = useState("");
  // بوت المتجر التفاعلي
  const [botActivating, setBotActivating] = useState(false);
  const [feeRows, setFeeRows] = useState<WilayaFeeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);

  // تعبئة رسوم الولايات من الإعدادات المحفوظة
  useEffect(() => {
    const saved = me.store.deliveryFees || {};
    setFeeRows(
      WILAYAS.map((w) => ({
        code: w.code,
        nameAr: w.nameAr,
        home: saved[String(w.code)]?.home != null ? String(saved[String(w.code)].home) : "",
        desk: saved[String(w.code)]?.desk != null ? String(saved[String(w.code)].desk) : "",
      }))
    );
  }, [me.store.deliveryFees]);

  const storeUrl = useMemo(() => {
    if (typeof window === "undefined") return `?s=${slug}`;
    return `${window.location.origin}/?s=${slug}`;
  }, [slug]);

  async function handleSave() {
    setSaveError("");

    if (name.trim().length < 2) {
      setSaveError("اسم المتجر قصير جدًا");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(slug)) {
      setSaveError("الرابط غير صالح: 3-30 حرفًا إنجليزيًا صغيرًا وأرقامًا وشرطات");
      return;
    }
    const home = parseFloat(defaultHomeFee);
    const desk = parseFloat(defaultDeskFee);
    if (isNaN(home) || home < 0 || isNaN(desk) || desk < 0) {
      setSaveError("أدخل رسوم توصيل افتراضية صحيحة");
      return;
    }

    // بناء خريطة الرسوم المخصصة (الفارغ = الافتراضي)
    const fees: Record<string, DeliveryFeeEntry> = {};
    for (const row of feeRows) {
      const h = parseFloat(row.home);
      const d = parseFloat(row.desk);
      if (!isNaN(h) && h >= 0 && !isNaN(d) && d >= 0) {
        fees[String(row.code)] = { home: h, desk: d };
      }
    }

    const uMin = parseInt(urgencyMinutes, 10);
    const uStock = parseInt(urgencyStock, 10);
    if (urgencyEnabled && (isNaN(uMin) || uMin < 5 || isNaN(uStock) || uStock < 1)) {
      setSaveError("عداد الاستعجال: المدة 5 دقائق على الأقل والكمية 1 على الأقل");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          description: description.trim(),
          phone: phone.trim(),
          logo,
          defaultHomeFee: home,
          defaultDeskFee: desk,
          deliveryFees: fees,
          // عداد الاستعجال
          urgencyEnabled,
          ...(urgencyEnabled ? { urgencyMinutes: uMin, urgencyStock: uStock } : {}),
          // واتساب
          whatsappEnabled,
          // نرسل مفاتيح واتساب/Replicate فقط إذا أدخلها التاجر (لتجنب المسح بالخطأ)
          ...(ultramsgInstance.trim() ? { ultramsgInstance: ultramsgInstance.trim() } : {}),
          ...(ultramsgToken.trim() ? { ultramsgToken: ultramsgToken.trim() } : {}),
          ...(replicateToken.trim() ? { replicateToken: replicateToken.trim() } : {}),
          // نرسل مفاتيح تليجرام فقط إذا أدخلها التاجر (لتجنب المسح بالخطأ)
          ...(botToken.trim() ? { telegramBotToken: botToken.trim() } : {}),
          ...(chatId.trim() ? { telegramChatId: chatId.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "تعذر الحفظ");
        return;
      }

      // إعادة جلب بيانات الجلسة
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (meRes.ok) {
        onUpdated(await meRes.json());
      }

      setBotToken("");
      setChatId("");
      setUltramsgInstance("");
      setUltramsgToken("");
      setReplicateToken("");
      toast({ title: "تم حفظ الإعدادات بنجاح ✅" });
    } catch {
      setSaveError("تعذر الاتصال، حاول مجددًا");
    } finally {
      setSaving(false);
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(storeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "تم نسخ رابط المتجر" });
    });
  }

  function resetFees() {
    setFeeRows(
      WILAYAS.map((w) => ({
        code: w.code,
        nameAr: w.nameAr,
        home: "",
        desk: "",
      }))
    );
    toast({ title: "تمت إعادة الرسوم للوضع الافتراضي" });
  }

  // تفعيل بوت المتجر التفاعلي (WebApp داخل تليجرام)
  async function activateBot() {
    setBotActivating(true);
    try {
      const res = await fetch("/api/telegram/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "فشل التفعيل",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "تم تفعيل بوت المتجر ✨",
        description: "الزبائن يفتحون متجرك مباشرة داخل تليجرام عبر /start",
      });
    } catch {
      toast({ title: "تعذر الاتصال", variant: "destructive" });
    } finally {
      setBotActivating(false);
    }
  }

  const customCount = feeRows.filter((r) => r.home !== "" || r.desk !== "").length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* معلومات المتجر */}
      <Card className="animate-fade-up">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
              <StoreIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-lg">معلومات المتجر</CardTitle>
              <CardDescription className="mt-0.5">
                هذه المعلومات تظهر لزبائنك في صفحة متجرك
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="st-name">اسم المتجر</Label>
              <Input
                id="st-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-phone">هاتف المتجر (اختياري)</Label>
              <Input
                id="st-phone"
                dir="ltr"
                className="text-left"
                placeholder="0550123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="st-slug">رابط المتجر</Label>
            <div dir="ltr" className="flex items-center rounded-md border border-input overflow-hidden text-sm">
              <span className="px-3 py-2 bg-muted text-muted-foreground whitespace-nowrap">
                ?s=
              </span>
              <Input
                id="st-slug"
                className="border-0 rounded-none text-left flex-1 focus-visible:ring-0"
                dir="ltr"
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/?s=${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                فتح المتجر
              </a>
              <button
                onClick={copyUrl}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {copied ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                نسخ الرابط
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="st-desc">وصف المتجر (اختياري)</Label>
            <Textarea
              id="st-desc"
              rows={2}
              placeholder="مثال: ملابس تقليدية جزائرية بجودة عالية وتوصيل لكل الولايات"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-w-48">
            <Label>شعار المتجر</Label>
            <ImagePicker
              value={logo}
              onChange={setLogo}
              label="شعار المتجر"
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* رسوم التوصيل */}
      <Card className="animate-fade-up stagger-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-soft border border-gold/25 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-gold-foreground" />
            </div>
            <div>
              <CardTitle className="font-display text-lg">
                رسوم التوصيل — 58 ولاية
              </CardTitle>
              <CardDescription className="mt-0.5">
                حدد رسوم التوصيل للمنزل ومكتب التوصيل لكل ولاية. اتركها فارغة لاستخدام الرسوم الافتراضية
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="st-home">رسوم افتراضية — للمنزل (دج)</Label>
              <Input
                id="st-home"
                dir="ltr"
                inputMode="numeric"
                className="text-left"
                value={defaultHomeFee}
                onChange={(e) => setDefaultHomeFee(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-desk">رسوم افتراضية — مكتب التوصيل (دج)</Label>
              <Input
                id="st-desk"
                dir="ltr"
                inputMode="numeric"
                className="text-left"
                value={defaultDeskFee}
                onChange={(e) => setDefaultDeskFee(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">رسوم مخصصة</Label>
              {customCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {customCount} ولاية
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFees}
              className="text-xs gap-1 text-muted-foreground"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة تعيين
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar rounded-xl border border-border/70">
            <table className="w-full text-sm">
              <thead className="sticky top-0 glass-strong z-10">
                <tr>
                  <th className="text-right font-semibold px-3.5 py-2.5 text-xs">#</th>
                  <th className="text-right font-semibold px-3.5 py-2.5 text-xs">الولاية</th>
                  <th className="text-right font-semibold px-3.5 py-2.5 text-xs w-28">المنزل</th>
                  <th className="text-right font-semibold px-3.5 py-2.5 text-xs w-28">المكتب</th>
                </tr>
              </thead>
              <tbody>
                {feeRows.map((row) => (
                  <tr key={row.code} className="border-t border-border/60 transition-colors hover:bg-muted/40">
                    <td className="px-3.5 py-1.5 text-muted-foreground text-xs tabular-nums">
                      {row.code}
                    </td>
                    <td className="px-3.5 py-1.5">{row.nameAr}</td>
                    <td className="px-2 py-1.5">
                      <Input
                        dir="ltr"
                        inputMode="numeric"
                        placeholder={`${me.store.defaultHomeFee}`}
                        className="h-9 text-xs text-left"
                        value={row.home}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, "");
                          setFeeRows((prev) =>
                            prev.map((r) => (r.code === row.code ? { ...r, home: v } : r))
                          );
                        }}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        dir="ltr"
                        inputMode="numeric"
                        placeholder={`${me.store.defaultDeskFee}`}
                        className="h-9 text-xs text-left"
                        value={row.desk}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, "");
                          setFeeRows((prev) =>
                            prev.map((r) => (r.code === row.code ? { ...r, desk: v } : r))
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* تليجرام */}
      <Card className="animate-fade-up stagger-3">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                إشعارات تليجرام
                {me.store.hasTelegram && (
                  <Badge className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] rounded-full">
                    مفعّل
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-0.5">
                استلم إشعارًا فوريًا في تليجرام عند وصول أي طلب جديد
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted/60 border border-border/60 p-4 text-xs leading-relaxed text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">كيف تحصل على المفاتيح؟</p>
            <p>
              1. تحدث مع <span dir="ltr" className="font-mono">@BotFather</span> في
              تليجرام وأرسل <span dir="ltr" className="font-mono">/newbot</span> ثم انسخ
              الرمز (Token).
            </p>
            <p>
              2. أرسل رسالة لبوتك الجديد، ثم زُر{" "}
              <span dir="ltr" className="font-mono">api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</span>{" "}
              وانسخ <span dir="ltr" className="font-mono">chat.id</span>.
            </p>
            <p>3. الصق المفاتيح هنا واحفظ.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="st-token">
                بوت توكِن {me.store.hasTelegram && "(متوفر — اتركه فارغًا للإبقاء)"}
              </Label>
              <Input
                id="st-token"
                dir="ltr"
                className="text-left font-mono text-xs"
                type="password"
                placeholder="123456:ABC-DEF..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-chat">
                معرف المحادثة {me.store.hasTelegram && "(متوفر — اتركه فارغًا للإبقاء)"}
              </Label>
              <Input
                id="st-chat"
                dir="ltr"
                className="text-left font-mono text-xs"
                placeholder="123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value.replace(/[^\d-]/g, ""))}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Send className="w-3 h-3" />
            تُحفظ مفاتيحك مشفرة بالكامل (AES-256) ولا يمكن لأي أحد قراءتها
          </p>

          <Separator />

          {/* بوت المتجر التفاعلي — WebApp داخل تليجرام */}
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">بوت المتجر التفاعلي (Mini-Store)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    الزبون يكتب <span dir="ltr" className="font-mono">/start</span> لبوتك
                    فيفتح متجرك داخل تليجرام مباشرة — يدعم رموز المسوقين
                    (<span dir="ltr" className="font-mono">/start AMINE10</span>)
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full shrink-0"
                onClick={activateBot}
                disabled={botActivating || !me.store.hasTelegram}
              >
                {botActivating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
                تفعيل البوت
              </Button>
            </div>
            {!me.store.hasTelegram && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                اربط توكن البوت أعلاه أولًا لتفعيل المتجر داخل تليجرام
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* عداد الاستعجال والندرة */}
      <Card className="animate-fade-up stagger-4">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900 flex items-center justify-center shrink-0">
              <Timer className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                عداد الاستعجال والندرة
                {urgencyEnabled && (
                  <Badge className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] rounded-full">
                    مفعّل
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-0.5">
                شريط &quot;الكمية محدودة + عد تنازلي&quot; أعلى متجرك — يرفع نسبة الشراء الفوري
              </CardDescription>
            </div>
            <Switch
              checked={urgencyEnabled}
              onCheckedChange={setUrgencyEnabled}
              className="mr-auto"
              aria-label="تفعيل عداد الاستعجال"
            />
          </div>
        </CardHeader>
        {urgencyEnabled && (
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="st-urg-min">مدة العد التنازلي (دقائق)</Label>
              <Input
                id="st-urg-min"
                dir="ltr"
                inputMode="numeric"
                className="text-left"
                value={urgencyMinutes}
                onChange={(e) => setUrgencyMinutes(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-urg-stock">الكمية المعلنة &quot;متبقي X قطع&quot;</Label>
              <Input
                id="st-urg-stock"
                dir="ltr"
                inputMode="numeric"
                className="text-left"
                value={urgencyStock}
                onChange={(e) => setUrgencyStock(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              العد التنازلي يبقى ثابتًا لكل زبون حتى لو أعاد تحميل الصفحة (لا يمكن التلاعب به بسهولة)
            </p>
          </CardContent>
        )}
      </Card>

      {/* واتساب — تأكيد العنوان التلقائي */}
      <Card className="animate-fade-up stagger-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                تأكيد الطلبات عبر واتساب
                {me.store.hasWhatsApp && (
                  <Badge className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] rounded-full">
                    مفعّل
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-0.5">
                عند كل طلب يُرسل للزبون رابط تأكيد العنوان عبر واتساب — يقلل الطلبيات الوهمية
              </CardDescription>
            </div>
            <Switch
              checked={whatsappEnabled}
              onCheckedChange={setWhatsappEnabled}
              className="mr-auto"
              aria-label="تفعيل واتساب"
            />
          </div>
        </CardHeader>
        {whatsappEnabled && (
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/60 border border-border/60 p-4 text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">كيف تحصل على مفاتيح UltraMsg؟</p>
              <p>
                1. أنشئ حسابًا في <span dir="ltr" className="font-mono">ultramsg.com</span>{" "}
                واربط رقم واتساب بمسح رمز QR.
              </p>
              <p>
                2. انسخ <span className="font-semibold">Instance ID</span> (مثل: instance12345)
                و<span className="font-semibold">Token</span> من لوحة التحكم.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="st-wa-instance">
                  Instance ID {me.store.hasWhatsApp && "(متوفر — اتركه فارغًا للإبقاء)"}
                </Label>
                <Input
                  id="st-wa-instance"
                  dir="ltr"
                  className="text-left font-mono text-xs"
                  placeholder="instance12345"
                  value={ultramsgInstance}
                  onChange={(e) => setUltramsgInstance(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-wa-token">
                  Token {me.store.hasWhatsApp && "(متوفر — اتركه فارغًا للإبقاء)"}
                </Label>
                <Input
                  id="st-wa-token"
                  dir="ltr"
                  className="text-left font-mono text-xs"
                  type="password"
                  placeholder="ultrams-token..."
                  value={ultramsgToken}
                  onChange={(e) => setUltramsgToken(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* مفتاح Replicate — إعلانات الفيديو */}
      <Card className="animate-fade-up stagger-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-900 flex items-center justify-center shrink-0">
              <Clapperboard className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                توليد إعلانات الفيديو
                {me.store.hasReplicate && (
                  <Badge className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] rounded-full">
                    مفعّل
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-0.5">
                مفتاح Replicate (BYOK) لتحويل صور المنتجات إلى فيديوهات إعلانية 9:16 لـ TikTok/Reels
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="st-replicate">
              Replicate API Token {me.store.hasReplicate && "(متوفر — اتركه فارغًا للإبقاء)"}
            </Label>
            <Input
              id="st-replicate"
              dir="ltr"
              className="text-left font-mono text-xs"
              type="password"
              placeholder="r8_xxxxxxxxxxxx..."
              value={replicateToken}
              onChange={(e) => setReplicateToken(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Send className="w-3 h-3" />
            السسكربت الإعلاني يعمل بدون مفتاح — المفتاح مطلوب فقط لتحويل الصورة إلى فيديو
          </p>
        </CardContent>
      </Card>

      {saveError && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3.5 py-2.5 animate-fade-in">
          {saveError}
        </p>
      )}

      <div className="sticky bottom-4 z-10">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="gap-2 shadow-lift w-full sm:w-auto rounded-full px-8 bg-gradient-to-l from-primary to-deep border-0"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          حفظ كل الإعدادات
        </Button>
      </div>
    </div>
  );
}
