"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDZD } from "@/lib/souq-types";
import type { AffiliateDTO } from "@/lib/souq-types";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import {
  Megaphone,
  Plus,
  Loader2,
  Copy,
  Trash2,
  Users,
  Wallet,
  ShoppingBag,
  Link2,
  MessageCircle,
} from "lucide-react";

interface AffiliatesViewProps {
  storeSlug: string;
}

/**
 * نظام التسويق بالعمولة (Affiliate & Referral Engine)
 * إدارة المسوقين: رموز إحالة فرويدة، روابط شخصية، تتبع العمولات
 */
export function AffiliatesView({ storeSlug }: AffiliatesViewProps) {
  const [affiliates, setAffiliates] = useState<AffiliateDTO[]>([]);
  const [pendingCommissions, setPendingCommissions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [commission, setCommission] = useState("10");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/affiliates", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAffiliates(data.affiliates);
        setPendingCommissions(data.pendingCommissions || 0);
      }
    } catch {
      // تجاهل
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalEarned = affiliates.reduce((s, a) => s + a.totalEarned, 0);
  const totalOrders = affiliates.reduce((s, a) => s + a.ordersCount, 0);

  function referralLink(code: string): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/?s=${storeSlug}&ref=${code}`;
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(referralLink(code)).then(() => {
      toast({
        title: "تم نسخ رابط الإحالة",
        description: `${referralLink(code)}`,
      });
    });
  }

  /** إرسال تقرير العمولات عبر واتساب للمسوق */
  async function sendWhatsAppReport(a: AffiliateDTO) {
    if (!a.phone) {
      toast({
        title: "لا يوجد رقم هاتف",
        description: `أضف رقم هاتف للمسوق ${a.name} ليصله التقرير`,
        variant: "destructive",
      });
      return;
    }
    setReporting(a.id);
    try {
      const res = await fetch("/api/affiliates/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId: a.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      haptic([50, 80, 50]);
      toast({ title: data.message || "وصل التقرير عبر واتساب ✓" });
    } catch (err) {
      toast({
        title: "تعذر إرسال التقرير",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setReporting(null);
    }
  }

  async function handleAdd() {
    if (name.trim().length < 2) {
      toast({ title: "أدخل اسم المسوق", variant: "destructive" });
      return;
    }
    const c = parseFloat(commission);
    if (isNaN(c) || c < 0 || c > 90) {
      toast({ title: "نسبة العمولة بين 0 و 90%", variant: "destructive" });
      return;
    }
    if (phone.trim() && !/^0[5-7][0-9]{8}$/.test(phone.trim())) {
      toast({ title: "رقم هاتف غير صالح", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          commission: c,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر الإضافة");

      setAffiliates((prev) => [data.affiliate, ...prev]);
      setAddOpen(false);
      setName("");
      setPhone("");
      setCommission("10");
      toast({
        title: "تمت إضافة المسوق",
        description: `رمزه: ${data.affiliate.code} — انسخ رابطه من القائمة`,
      });
    } catch (err) {
      toast({
        title: "فشل الإضافة",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/affiliates?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAffiliates((prev) => prev.filter((a) => a.id !== id));
        toast({ title: "تم حذف المسوق" });
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-gold" />
            التسويق بالعمولة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            كل مسوق برابط ورمز خاص — تُنسب له طلبياته وتُحتسب عمولته عند التسليم
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-2 rounded-xl bg-gradient-to-l from-primary to-deep border-0 shadow-md shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          إضافة مسوق
        </Button>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "المسوقون",
            value: String(affiliates.length),
            icon: Users,
            tint: "text-sky-600 bg-sky-100 dark:bg-sky-950/50",
          },
          {
            label: "طلبيات المسوقين",
            value: String(totalOrders),
            icon: ShoppingBag,
            tint: "text-violet-600 bg-violet-100 dark:bg-violet-950/50",
          },
          {
            label: "عمولات مستحقة (جارية)",
            value: formatDZD(pendingCommissions),
            icon: Wallet,
            tint: "text-amber-600 bg-amber-100 dark:bg-amber-950/50",
          },
          {
            label: "عمولات مدفوعة (مُسلّمة)",
            value: formatDZD(totalEarned),
            icon: Wallet,
            tint: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50",
          },
        ].map((s) => (
          <Card key={s.label} className="border-border/70 shadow-soft">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.tint}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-display font-bold leading-tight truncate">
                  {s.value}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* قائمة المسوقين */}
      <Card className="border-border/70 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">قائمة المسوقين</CardTitle>
          <CardDescription>
            العمولة تُحتسب على سعر المنتجات فقط (بدون رسوم التوصيل) وتُضاف عند التسليم
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : affiliates.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Link2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                لا مسوقين بعد — أضف أول مسوق وامنحه رابط إحالة خاص
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المسوق</TableHead>
                    <TableHead className="text-right">الرمز</TableHead>
                    <TableHead className="text-right">العمولة</TableHead>
                    <TableHead className="text-right">الطلبيات</TableHead>
                    <TableHead className="text-right">عمولاته</TableHead>
                    <TableHead className="text-right">رابط الإحالة</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="font-semibold text-sm">{a.name}</p>
                        {a.phone && (
                          <p dir="ltr" className="text-[11px] text-muted-foreground text-right">
                            {a.phone}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          dir="ltr"
                          className="font-mono border-gold/50 text-gold-foreground bg-gold/10"
                        >
                          {a.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {a.commission}%
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {a.ordersCount}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums font-semibold text-primary">
                        {formatDZD(a.totalEarned)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => copyLink(a.code)}
                          >
                            <Copy className="w-3 h-3" />
                            نسخ الرابط
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-xs text-emerald-700 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => sendWhatsAppReport(a)}
                            disabled={reporting === a.id}
                            title="إرسال تقرير العمولات عبر واتساب"
                          >
                            {reporting === a.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <MessageCircle className="w-3 h-3" />
                            )}
                            تقرير واتساب
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(a.id)}
                          disabled={deleting === a.id}
                          aria-label={`حذف ${a.name}`}
                        >
                          {deleting === a.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة إضافة مسوق */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-right">
              إضافة مسوق بالعمولة
            </DialogTitle>
            <DialogDescription className="text-right">
              سيولد رمز إحالة فريد تلقائيًا (مثال: AMINE-K3Q7)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="af-name">اسم المسوق *</Label>
              <Input
                id="af-name"
                placeholder="مثال: أمين"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af-phone">هاتف المسوق (اختياري)</Label>
              <Input
                id="af-phone"
                dir="ltr"
                inputMode="numeric"
                placeholder="0550123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af-commission">نسبة العمولة % *</Label>
              <Input
                id="af-commission"
                dir="ltr"
                inputMode="decimal"
                type="number"
                min={0}
                max={90}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="rounded-xl gap-2 bg-gradient-to-l from-primary to-deep border-0"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
