"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  formatDZD,
  formatDateAr,
} from "@/lib/souq-types";
import type { OrderDTO, OrderStatus } from "@/lib/souq-types";
import {
  Phone,
  MapPin,
  Truck,
  Home,
  ClipboardList,
  Trash2,
  Search,
  Copy,
  CheckCheck,
  AlertTriangle,
  ShieldCheck,
  Megaphone,
  Undo2,
  Facebook,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STATUS_ORDER: OrderStatus[] = ["NEW", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export function OrdersView({
  orders,
  loading,
  onReload,
}: {
  orders: OrderDTO[];
  loading: boolean;
  onReload: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderDTO | null>(null);
  const [deleting, setDeleting] = useState<OrderDTO | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const counts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.productName.toLowerCase().includes(q) ||
      o.orderNumber.toLowerCase().includes(q)
    );
  });

  async function updateStatus(order: OrderDTO, status: OrderStatus) {
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      onReload();
      if (selected?.id === order.id) {
        setSelected({ ...order, status });
      }
      toast({
        title: "تم تحديث الحالة",
        description: `${order.orderNumber} → ${ORDER_STATUS_LABELS[status]}`,
      });
    } catch {
      toast({ title: "تعذر تحديث الحالة", variant: "destructive" });
    } finally {
      setUpdateLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/orders/${deleting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onReload();
      toast({ title: "تم حذف الطلبية", description: deleting.orderNumber });
      if (selected?.id === deleting.id) setSelected(null);
      setDeleting(null);
    } catch {
      toast({ title: "تعذر حذف الطلبية", variant: "destructive" });
    }
  }

  // تسجيل إرجاع (Retour): إلغاء + إضافة الرقم للقائمة السوداء
  async function reportRetour(order: OrderDTO) {
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", reportRetour: true }),
      });
      if (!res.ok) throw new Error();
      onReload();
      if (selected?.id === order.id) {
        setSelected({ ...order, status: "CANCELLED" });
      }
      toast({
        title: "تم تسجيل الإرجاع",
        description: `أُضيف ${order.customerPhone} لقائمة الزبناء الوهميين`,
      });
    } catch {
      toast({ title: "تعذر تسجيل الإرجاع", variant: "destructive" });
    } finally {
      setUpdateLoading(false);
    }
  }

  function copyPhone(phone: string) {
    navigator.clipboard.writeText(phone).then(() => {
      toast({ title: "تم نسخ الرقم", description: phone });
    });
  }

  return (
    <div className="space-y-4">
      {/* الفلاتر */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="الكل"
            count={orders.length}
            active={statusFilter === "ALL"}
            onClick={() => setStatusFilter("ALL")}
          />
          {STATUS_ORDER.map((s) => (
            <FilterChip
              key={s}
              label={ORDER_STATUS_LABELS[s]}
              count={counts[s] || 0}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>
        <div className="relative flex-1 min-w-44 max-w-xs mr-auto">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ابحث بالاسم، الهاتف، المنتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 rounded-full bg-card"
          />
        </div>
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="py-0">
              <CardContent className="p-4 h-18 animate-pulse bg-muted/50 rounded-2xl" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-border rounded-3xl bg-muted/40 animate-fade-up">
          <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-primary/10 to-gold/15 border border-primary/15 flex items-center justify-center mb-5">
            <ClipboardList className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-display font-bold text-xl">لا توجد طلبيات</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
            {orders.length === 0
              ? "ستظهر طلبيات زبائنك هنا مباشرة عند وصولها، مع إشعار تليجرام إن فعّلته"
              : "لا نتائج مطابقة للفلترة الحالية"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o, i) => (
            <Card
              key={o.id}
              className={`py-0 lift hover:shadow-lift hover:border-primary/25 cursor-pointer animate-fade-up stagger-${(i % 8) + 1}`}
              onClick={() => setSelected(o)}
            >
              <CardContent className="p-4 lg:p-5">
                <div className="flex items-center gap-3.5 flex-wrap">
                  <div className="flex-1 min-w-44">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{o.customerName}</p>
                      <Badge
                        variant="outline"
                        className={`${ORDER_STATUS_COLORS[o.status]} text-[10px] rounded-full`}
                      >
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                      {o.riskLevel === "HIGH" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          خطر عالٍ
                        </Badge>
                      )}
                      {o.confirmedAt && (
                        <Badge
                          variant="outline"
                          className="text-[10px] rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          العنوان مؤكد
                        </Badge>
                      )}
                      {o.affiliateCode && (
                        <Badge
                          variant="outline"
                          dir="ltr"
                          className="text-[10px] rounded-full bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800 gap-1 font-mono"
                        >
                          <Megaphone className="w-3 h-3" />
                          {o.affiliateCode}
                        </Badge>
                      )}
                      {o.source === "FACEBOOK_LEAD_AD" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 gap-1"
                        >
                          <Facebook className="w-3 h-3" />
                          من فايسبوك
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span dir="ltr" className="tabular-nums">{o.customerPhone}</span>
                      <span>·</span>
                      <span>{o.wilayaName}</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline truncate max-w-40">
                        {o.productName} ×{o.quantity}
                      </span>
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-display font-bold text-primary whitespace-nowrap">
                      {formatDZD(o.total)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDateAr(o.createdAt).split("،")[0]}
                    </p>
                  </div>
                  <div className="w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={o.status}
                      onValueChange={(v) => updateStatus(o, v as OrderStatus)}
                      disabled={updateLoading}
                    >
                      <SelectTrigger className="h-9 w-full sm:w-38 text-xs rounded-lg" aria-label="تغيير حالة الطلبية">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {ORDER_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* نافذة تفاصيل الطلبية */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <span>{selected.customerName}</span>
                  <Badge
                    variant="outline"
                    className={ORDER_STATUS_COLORS[selected.status]}
                  >
                    {ORDER_STATUS_LABELS[selected.status]}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5">
                  <span dir="ltr" className="font-mono">{selected.orderNumber}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selected.orderNumber).then(() =>
                        toast({ title: "تم نسخ رقم الطلبية" })
                      );
                    }}
                    aria-label="نسخ رقم الطلبية"
                    className="hover:text-foreground"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* المنتج */}
                <div className="rounded-xl border p-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">المنتج</p>
                  <p className="font-medium">{selected.productName}</p>
                  {selected.selectedOption && (
                    <Badge variant="secondary" className="text-xs">
                      {selected.selectedOption}
                    </Badge>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {formatDZD(selected.unitPrice)} × {selected.quantity} ={" "}
                    <span className="font-semibold text-foreground">
                      {formatDZD(selected.unitPrice * selected.quantity)}
                    </span>
                  </div>
                </div>

                {/* بيانات الزبون */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      الهاتف
                    </span>
                    <button
                      className="flex items-center gap-1 hover:text-primary"
                      dir="ltr"
                      onClick={() => copyPhone(selected.customerPhone)}
                    >
                      {selected.customerPhone}
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      الولاية
                    </span>
                    <span>
                      {selected.wilayaName}
                      {selected.commune ? ` - ${selected.commune}` : ""}
                    </span>
                  </div>
                  {selected.address && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                        <Home className="w-4 h-4" />
                        العنوان
                      </span>
                      <span className="text-left">{selected.address}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      التوصيل
                    </span>
                    <span>
                      {selected.deliveryType === "desk" ? "مكتب التوصيل" : "للمنزل"} ·{" "}
                      {formatDZD(selected.deliveryFee)}
                    </span>
                  </div>
                </div>

                {selected.notes && (
                  <div className="rounded-xl bg-muted p-3 text-sm">
                    <p className="text-xs text-muted-foreground font-medium mb-1">
                      ملاحظات الزبون
                    </p>
                    {selected.notes}
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-medium">الإجمالي (الدفع عند الاستلام)</span>
                  <span className="text-lg font-bold text-primary">
                    {formatDZD(selected.total)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {formatDateAr(selected.createdAt)}
                </p>

                {/* تحذير الزبون الوهمي + تأكيد العنوان + المسوق */}
                {selected.riskLevel === "HIGH" && (
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    هذا الرقم لديه طلبيات مرجعة سابقة — تأكد قبل الشحن
                  </p>
                )}
                {selected.confirmedAt && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    أكد الزبون عنوانه عبر رابط واتساب
                  </p>
                )}
                {selected.affiliateCode && (
                  <p className="text-xs text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                    <Megaphone className="w-4 h-4 shrink-0" />
                    طلبيات مسوّق {selected.affiliateCode}
                    {selected.commission > 0 && (
                      <span className="font-bold">
                        — العمولة: {formatDZD(selected.commission)}
                      </span>
                    )}
                  </p>
                )}
                {selected.source === "FACEBOOK_LEAD_AD" && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                    <Facebook className="w-4 h-4 shrink-0" />
                    طلبيتة وصلت تلقائيًا من إعلان فايسبوك (Lead Ad)
                  </p>
                )}

                {/* تغيير الحالة */}
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_ORDER.filter((s) => s !== selected.status).map((s) => (
                    <Button
                      key={s}
                      variant={s === "CANCELLED" ? "outline" : "secondary"}
                      size="sm"
                      className="gap-1.5"
                      disabled={updateLoading}
                      onClick={() => updateStatus(selected, s)}
                    >
                      {s === "DELIVERED" && <CheckCheck className="w-3.5 h-3.5" />}
                      {ORDER_STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>

                {/* تسجيل إرجاع — يغذي القائمة السوداء */}
                {selected.status !== "CANCELLED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    disabled={updateLoading}
                    onClick={() => reportRetour(selected)}
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    تسجيل إرجاع (Retour) — حجب الرقم
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive w-full"
                  onClick={() => setDeleting(selected)}
                >
                  <Trash2 className="w-4 h-4 ml-1" />
                  حذف الطلبية
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الطلبية؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الطلبية {deleting?.orderNumber} نهائيًا من السجل.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              نعم، احذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`mr-1.5 inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-[10px] ${
          active ? "bg-white/20" : "bg-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
