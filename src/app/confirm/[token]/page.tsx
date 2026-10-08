"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Package,
  Store,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { formatDZD } from "@/lib/souq-types";

interface ConfirmOrderInfo {
  orderNumber: string;
  productName: string;
  quantity: number;
  selectedOption: string | null;
  customerName: string;
  wilayaName: string;
  commune: string | null;
  address: string | null;
  deliveryType: string;
  total: number;
  status: string;
  confirmedAt: string | null;
  storeName: string;
}

/**
 * صفحة تأكيد العنوان العام — يفتحها الزبون من رابط واتساب
 * لتأكيد عنوان التوصيل بنقرة واحدة خلال 24 ساعة
 */
export default function ConfirmOrderPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";

  const [order, setOrder] = useState<ConfirmOrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commune, setCommune] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/confirm-order/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "رابط غير صالح");
        return data;
      })
      .then((data) => {
        setOrder(data.order);
        setCommune(data.order.commune || "");
        setAddress(data.order.address || "");
        setConfirmed(Boolean(data.order.confirmedAt));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleConfirm() {
    setError("");
    if (order?.deliveryType === "home" && address.trim().length < 5) {
      setError("أدخل عنوان التوصيل الكامل للتأكيد");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/confirm-order/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commune, address, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر التأكيد، حاول مجددًا");
        return;
      }
      setConfirmed(true);
    } catch {
      setError("تعذر الاتصال، تحقق من اتصالك بالإنترنت");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center gap-4">
        <div className="w-20 h-20 rounded-3xl bg-muted border border-border flex items-center justify-center">
          <Package className="w-9 h-9 text-muted-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold">رابط غير صالح</h1>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          {error} — تأكد من فتح الرابط المرسل إليك عبر واتساب
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/[0.04] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6 animate-fade-up">
          {/* الترويسة */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-deep text-primary-foreground shadow-lg shadow-primary/25">
              <Truck className="w-8 h-8" />
            </div>
            <h1 className="font-display text-2xl font-extrabold">
              {confirmed ? "تم تأكيد العنوان!" : "تأكيد عنوان التوصيل"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {confirmed
                ? "شكرًا لك — سيرسل التاجر طلبيتك قريبًا"
                : `${order?.customerName}، أكّد عنوانك لتجهيز طلبيتك فورًا`}
            </p>
          </div>

          {/* ملخص الطلبية */}
          <div className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-md shadow-soft p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground">
                متجر {order?.storeName}
              </span>
              <span
                dir="ltr"
                className="font-mono text-xs font-bold bg-muted rounded-full px-2.5 py-1"
              >
                {order?.orderNumber}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-snug">
                  {order?.productName}
                  {order?.selectedOption ? ` — ${order.selectedOption}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  الكمية: {order?.quantity} ·{" "}
                  {order?.deliveryType === "desk" ? "مكتب التوصيل" : "توصيل للمنزل"}
                </p>
              </div>
            </div>

            <div className="flex justify-between text-sm border-t border-dashed border-border pt-3">
              <span className="text-muted-foreground">الإجمالي عند الاستلام</span>
              <span className="font-display font-bold text-primary">
                {order ? formatDZD(order.total) : ""}
              </span>
            </div>
          </div>

          {confirmed ? (
            <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-6 text-center space-y-3 animate-scale-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                تم استلام تأكيدك بنجاح
              </p>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                أُبلغ التاجر بعنوانك وستُجهّز الطلبية للشحن قريبًا.
                <br />
                الدفع نقدًا عند الاستلام.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-md shadow-soft p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cf-address" className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  عنوان التوصيل الكامل *
                </Label>
                <Textarea
                  id="cf-address"
                  rows={2}
                  placeholder="الحي، الشارع، رقم المنزل... (الولاية محفوظة مسبقًا)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-commune">البلدية</Label>
                <Input
                  id="cf-commune"
                  placeholder="مثال: باب الزوار"
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-notes">ملاحظة للتاجر (اختياري)</Label>
                <Textarea
                  id="cf-notes"
                  rows={2}
                  placeholder="مثال: اتصل بي قبل الوصول"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3.5 py-2.5">
                  {error}
                </p>
              )}

              <Button
                className="w-full h-12 text-base gap-2 rounded-2xl bg-gradient-to-l from-primary to-deep border-0 shadow-lg shadow-primary/25"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                تأكيد العنوان الآن
              </Button>
            </div>
          )}

          <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <Store className="w-3 h-3" />
            {order?.storeName} — الدفع عند الاستلام في 58 ولاية
          </p>
        </div>
      </div>
    </div>
  );
}
