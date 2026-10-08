"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDZD } from "@/lib/souq-types";
import { haptic } from "@/lib/haptics";
import type { ProductDTO, DeliveryFeeEntry } from "@/lib/souq-types";
import { WILAYAS } from "@/lib/wilayas";
import {
  Loader2,
  Home,
  Building2,
  Minus,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Phone,
  User,
  MapPin,
  StickyNote,
} from "lucide-react";

interface CheckoutDialogProps {
  slug: string;
  product: ProductDTO | null;
  store: {
    defaultHomeFee: number;
    defaultDeskFee: number;
    deliveryFees: Record<string, DeliveryFeeEntry>;
    whatsappEnabled?: boolean;
  };
  refCode?: string | null;
  onOpenChange: (open: boolean) => void;
}

interface SuccessInfo {
  orderNumber: string;
  total: number;
  whatsappSent: boolean;
}

/**
 * نموذج الطلب السريع للزبون — بدون حساب، الدفع عند الاستلام
 */
export function CheckoutDialog({ slug, product, store, refCode, onOpenChange }: CheckoutDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [wilayaCode, setWilayaCode] = useState("");
  const [commune, setCommune] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState<"home" | "desk">("home");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  // حماية ضد الرسائل العشوائية: حقل فخ مخفي + فخ زمني
  const [honeyWebsite, setHoneyWebsite] = useState("");
  const openedAtRef = useRef(Date.now());

  // إعادة التهيئة عند فتح المنتج
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedOption(product.options[0]?.choices[0] || "");
      setSuccess(null);
      setError("");
      setHoneyWebsite("");
      openedAtRef.current = Date.now();
    }
  }, [product]);

  const wilaya = WILAYAS.find((w) => String(w.code) === wilayaCode);

  const deliveryFee = useMemo(() => {
    if (!wilaya) return null;
    const override = store.deliveryFees[String(wilaya.code)];
    if (deliveryType === "desk") {
      return override?.desk ?? store.defaultDeskFee;
    }
    return override?.home ?? store.defaultHomeFee;
  }, [wilaya, deliveryType, store]);

  const subtotal = product ? product.price * quantity : 0;
  const total = subtotal + (deliveryFee ?? 0);

  async function handleSubmit() {
    if (!product) return;
    setError("");
    haptic(30);

    if (customerName.trim().length < 2) {
      setError("أدخل اسمك الكامل");
      return;
    }
    if (!/^0[5-7][0-9]{8}$/.test(customerPhone.replace(/\s/g, ""))) {
      setError("أدخل رقم هاتف جزائري صحيح (مثال: 0550123456)");
      return;
    }
    if (!wilaya) {
      setError("اختر ولايتك");
      return;
    }
    if (deliveryType === "home" && address.trim().length < 5) {
      setError("أدخل عنوانك الكامل للتوصيل إلى المنزل");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/store/${encodeURIComponent(slug)}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          selectedOption: selectedOption || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.replace(/\s/g, ""),
          wilayaCode: wilaya.code,
          commune: commune.trim() || null,
          address: address.trim() || null,
          deliveryType,
          notes: notes.trim() || null,
          // رمز المسوق (أُلتقط من ?ref= أو من بوت تليجرام)
          refCode: refCode || null,
          // حقول الحماية ضد الروبوتات (تتحقق منها الواجهة الخلفية)
          website: honeyWebsite || null,
          elapsedMs: Date.now() - openedAtRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر إرسال الطلب، حاول مجددًا");
        return;
      }
      haptic([50, 80, 50]); // اهتزاز نجاح مميز
      setSuccess({
        orderNumber: data.orderNumber,
        total: data.total,
        whatsappSent: Boolean(data.whatsappSent),
      });
    } catch {
      setError("تعذر الاتصال، تحقق من اتصالك بالإنترنت");
    } finally {
      setSubmitting(false);
    }
  }

  if (!product) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto custom-scrollbar">
        {success ? (
          // شاشة النجاح
          <div className="py-4 text-center space-y-5 animate-fade-up">
            <div className="relative mx-auto w-22 h-22 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-emerald-400/60 ring-pulse" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/70 dark:to-emerald-900/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center animate-scale-in shadow-soft">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">تم استلام طلبك!</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                سيتصل بك صاحب المتجر قريبًا لتأكيد الطلبية.
                <br />
                الدفع يكون نقدًا عند الاستلام.
              </p>
              {success.whatsappSent && (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl px-3 py-2 mt-3 animate-fade-in">
                  📱 أُرسل لك رابط تأكيد العنوان عبر واتساب — أكّد عنوانك بنقرة واحدة لتسريع الشحن
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-muted/70 border border-border/60 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم الطلبية</span>
                <span dir="ltr" className="font-mono font-bold">{success.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ الإجمالي</span>
                <span className="font-display font-bold text-primary">{formatDZD(success.total)}</span>
              </div>
            </div>

            <Button className="w-full h-11 rounded-xl" onClick={() => onOpenChange(false)}>
              تصفح المزيد
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-right">إتمام الطلب</DialogTitle>
              <DialogDescription className="text-right">
                {product.name}
                {selectedOption && (
                  <span className="text-foreground font-semibold"> — {selectedOption}</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* حقل الفخ ضد الروبوتات — مخفي تمامًا عن البشر؛ الروبوتات تعبّئه تلقائيًا فتُرفض طلبيتها */}
              <div className="hp-field" aria-hidden="true">
                <label htmlFor="co-website">الموقع الإلكتروني</label>
                <input
                  id="co-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeyWebsite}
                  onChange={(e) => setHoneyWebsite(e.target.value)}
                />
              </div>

              {/* الكمية */}
              <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-muted/40 p-3">
                <span className="text-sm font-semibold">الكمية</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="تقليل الكمية"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-display font-bold text-lg tabular-nums">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                    disabled={quantity >= 50}
                    aria-label="زيادة الكمية"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* بيانات الزبون */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="co-name" className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    الاسم الكامل *
                  </Label>
                  <Input
                    id="co-name"
                    placeholder="مثال: أمين بن علي"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="co-phone" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    رقم الهاتف *
                  </Label>
                  <Input
                    id="co-phone"
                    dir="ltr"
                    className="text-left"
                    inputMode="numeric"
                    placeholder="0550123456"
                    value={customerPhone}
                    onChange={(e) =>
                      setCustomerPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))
                    }
                    autoComplete="tel"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      الولاية *
                    </Label>
                    <Select value={wilayaCode} onValueChange={setWilayaCode}>
                      <SelectTrigger aria-label="اختيار الولاية">
                        <SelectValue placeholder="اختر الولاية" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 custom-scrollbar">
                        {WILAYAS.map((w) => (
                          <SelectItem key={w.code} value={String(w.code)}>
                            {w.code} - {w.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-commune">البلدية</Label>
                    <Input
                      id="co-commune"
                      placeholder="مثال: باب الزوار"
                      value={commune}
                      onChange={(e) => setCommune(e.target.value)}
                    />
                  </div>
                </div>

                {/* نوع التوصيل */}
                <div className="space-y-1.5">
                  <Label>نوع التوصيل *</Label>
                  <RadioGroup
                    value={deliveryType}
                    onValueChange={(v) => setDeliveryType(v as "home" | "desk")}
                    className="grid grid-cols-2 gap-2.5"
                  >
                    <label
                      className={`flex items-center gap-2.5 rounded-2xl border p-3.5 cursor-pointer transition-all duration-300 ${
                        deliveryType === "home"
                          ? "border-primary bg-primary/[0.06] shadow-sm"
                          : "hover:bg-muted/60 hover:border-input"
                      }`}
                    >
                      <RadioGroupItem value="home" id="dl-home" />
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <Home className="w-3.5 h-3.5 text-primary" />
                          للمنزل
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDZD(
                            wilaya
                              ? store.deliveryFees[String(wilaya.code)]?.home ??
                                  store.defaultHomeFee
                              : store.defaultHomeFee
                          )}
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-2.5 rounded-2xl border p-3.5 cursor-pointer transition-all duration-300 ${
                        deliveryType === "desk"
                          ? "border-primary bg-primary/[0.06] shadow-sm"
                          : "hover:bg-muted/60 hover:border-input"
                      }`}
                    >
                      <RadioGroupItem value="desk" id="dl-desk" />
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          مكتب التوصيل
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDZD(
                            wilaya
                              ? store.deliveryFees[String(wilaya.code)]?.desk ??
                                  store.defaultDeskFee
                              : store.defaultDeskFee
                          )}
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {deliveryType === "home" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="co-address">العنوان الكامل *</Label>
                    <Input
                      id="co-address"
                      placeholder="الحي، الشارع، رقم المنزل..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="co-notes" className="flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5" />
                    ملاحظات (اختياري)
                  </Label>
                  <Textarea
                    id="co-notes"
                    rows={2}
                    placeholder="أي تفاصيل إضافية تريد إخبار التاجر بها..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* ملخص الفاتورة */}
              <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-muted/70 to-primary/[0.05] p-4.5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    سعر المنتج × {quantity}
                  </span>
                  <span className="tabular-nums">{formatDZD(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    التوصيل {wilaya ? `إلى ${wilaya.nameAr}` : ""}
                  </span>
                  <span className="tabular-nums">{deliveryFee !== null ? formatDZD(deliveryFee) : "—"}</span>
                </div>
                <div className="border-t border-dashed border-border" />
                <div className="flex justify-between font-bold text-base">
                  <span>الإجمالي عند الاستلام</span>
                  <span className="font-display text-primary">{formatDZD(total)}</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3.5 py-2.5 animate-fade-in">
                  {error}
                </p>
              )}

              <Button
                className="w-full h-13 text-base gap-2 rounded-2xl bg-gradient-to-l from-primary to-deep border-0 shadow-lg shadow-primary/25"
                onClick={handleSubmit}
                disabled={submitting || !wilaya}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                تأكيد الطلب — {formatDZD(total)}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                بتأكيدك للطلب أنت توافق على استلام الطلبية وتسديد مبلغها نقدًا
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
