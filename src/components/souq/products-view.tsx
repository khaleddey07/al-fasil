"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { ProductWizard } from "./product-wizard";
import { PublishDialog } from "./publish-dialog";
import { formatDZD } from "@/lib/souq-types";
import type { ProductDTO } from "@/lib/souq-types";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  PackageX,
  Loader2,
  Sparkles,
  Search,
  Megaphone,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export function ProductsView({
  products,
  loading,
  onReload,
}: {
  products: ProductDTO[];
  loading: boolean;
  onReload: () => void;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [deleting, setDeleting] = useState<ProductDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [publishing, setPublishing] = useState<ProductDTO | null>(null);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function openNew() {
    setEditing(null);
    setWizardOpen(true);
  }

  function openEdit(p: ProductDTO) {
    setEditing(p);
    setWizardOpen(true);
  }

  async function toggleActive(p: ProductDTO, active: boolean) {
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      if (!res.ok) throw new Error();
      onReload();
      toast({
        title: active ? "تم عرض المنتج" : "تم إخفاء المنتج",
        description: p.name,
      });
    } catch {
      toast({ title: "تعذر التحديث", variant: "destructive" });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/products/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onReload();
      toast({
        title: data.archived ? "تم إخفاء المنتج" : "تم حذف المنتج",
        description: data.message || deleting.name,
      });
      setDeleting(null);
    } catch (err) {
      toast({
        title: "تعذر الحذف",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openNew} className="gap-2 rounded-full px-5">
          <Plus className="w-4 h-4" />
          إضافة منتج
        </Button>
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ابحث في منتجاتك..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 rounded-full bg-card"
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-3 py-1.5">
          {products.length} منتج
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square bg-muted animate-pulse rounded-t-2xl -mt-6" />
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyProducts
          hasAny={products.length > 0}
          onNew={openNew}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => (
            <Card
              key={p.id}
              className={`group overflow-hidden lift hover:shadow-lift hover:border-primary/30 animate-fade-up stagger-${(i % 8) + 1}`}
            >
              <div className="relative aspect-square bg-muted overflow-hidden -mt-6 rounded-t-2xl">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/70 bg-gradient-to-br from-muted to-primary/[0.06]">
                    <Package className="w-10 h-10" />
                  </div>
                )}
                {!p.isActive && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
                    <Badge variant="outline" className="gap-1 bg-card/90">
                      <PackageX className="w-3 h-3" />
                      مخفي
                    </Badge>
                  </div>
                )}
                {p.options.length > 0 && (
                  <div className="absolute top-2.5 right-2.5">
                    <Badge className="bg-primary/90 backdrop-blur text-[10px] rounded-full shadow-sm">
                      {p.options.length} خيار
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4 space-y-2.5">
                <p className="font-semibold text-sm leading-snug line-clamp-2 min-h-10">
                  {p.name}
                </p>
                <p className="font-display text-primary font-bold text-[15px]">
                  {formatDZD(p.price)}
                </p>
                <div className="flex items-center justify-between pt-2.5 border-t border-border/70">
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={p.isActive}
                      onCheckedChange={(v) => toggleActive(p, v)}
                      aria-label="عرض/إخفاء المنتج"
                    />
                  </div>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-gold/15 hover:text-gold-strong"
                      onClick={() => setPublishing(p)}
                      aria-label={`نشر ${p.name} على الشبكات`}
                    >
                      <Megaphone className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                      onClick={() => openEdit(p)}
                      aria-label="تعديل المنتج"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleting(p)}
                      aria-label="حذف المنتج"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editing={editing}
        onSaved={onReload}
      />

      <PublishDialog product={publishing} onOpenChange={(open) => !open && setPublishing(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المنتج؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف &quot;{deleting?.name}&quot; نهائيًا من متجرك. إذا كان مرتبطًا
              بطلبيات سابقة، سيتم إخفاؤه فقط للحفاظ على سجل الطلبيات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleteLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleteLoading}
              className="bg-destructive text-white hover:bg-destructive/90 gap-2"
            >
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              نعم، احذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyProducts({ hasAny, onNew }: { hasAny: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-border rounded-3xl bg-muted/40 animate-fade-up">
      <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-primary/10 to-gold/15 border border-primary/15 flex items-center justify-center mb-5">
        {hasAny ? (
          <Search className="w-8 h-8 text-primary" />
        ) : (
          <Package className="w-8 h-8 text-primary" />
        )}
      </div>
      <h3 className="font-display font-bold text-xl">
        {hasAny ? "لا نتائج للبحث" : "لا توجد منتجات بعد"}
      </h3>
      {hasAny ? (
        <p className="text-sm text-muted-foreground mt-1.5">جرب كلمة بحث أخرى</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
            أضف أول منتج في متجرك — اكتب وصفه أو سجّله صوتيًا ودع الذكاء الاصطناعي يكمل التفاصيل
          </p>
          <Button onClick={onNew} className="mt-6 gap-2 rounded-full px-6">
            <Sparkles className="w-4 h-4 text-gold" />
            إضافة أول منتج
          </Button>
        </>
      )}
    </div>
  );
}
