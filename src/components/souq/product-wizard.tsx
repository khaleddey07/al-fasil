"use client";

import { useEffect, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Recorder } from "./recorder";
import { ImagePicker } from "./image-picker";
import {
  Sparkles,
  Loader2,
  Plus,
  X,
  Wand2,
  ArrowRight,
  Package,
} from "lucide-react";
import type { ProductDTO, ProductOption } from "@/lib/souq-types";

interface ProductWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ProductDTO | null;
  onSaved: () => void;
}

interface WizardForm {
  name: string;
  description: string;
  price: string;
  options: ProductOption[];
  imageUrl: string | null;
  isActive: boolean;
}

const EMPTY_FORM: WizardForm = {
  name: "",
  description: "",
  price: "",
  options: [],
  imageUrl: null,
  isActive: true,
};

/**
 * معالج إنشاء/تعديل المنتجات مع الذكاء الاصطناعي:
 * - إدخال نصي أو صوتي للوصف، ويستخرج AI: الاسم، السعر، الوصف، الخيارات
 * - تحسين الوصف تلقائيًا
 * - إدارة الخيارات (ألوان/مقاسات...) والصور
 */
export function ProductWizard({ open, onOpenChange, editing, onSaved }: ProductWizardProps) {
  const [form, setForm] = useState<WizardForm>(EMPTY_FORM);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [aiFilled, setAiFilled] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          description: editing.description || "",
          price: String(editing.price),
          options: editing.options,
          imageUrl: editing.imageUrl,
          isActive: editing.isActive,
        });
        setAiInput(editing.description || "");
        setAiFilled(false);
      } else {
        setForm(EMPTY_FORM);
        setAiInput("");
        setAiFilled(false);
      }
      setAiError("");
      setSaveError("");
    }
  }, [open, editing]);

  function applyParsed(parsed: {
    name: string;
    description: string;
    price: number | null;
    options: ProductOption[];
  }) {
    setForm((prev) => ({
      ...prev,
      name: parsed.name || prev.name,
      description: parsed.description || prev.description,
      price: parsed.price !== null ? String(parsed.price) : prev.price,
      options: parsed.options.length ? parsed.options : prev.options,
    }));
    setAiFilled(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  }

  async function analyzeText() {
    if (aiInput.trim().length < 3) {
      setAiError("اكتب وصفًا للمنتج أولًا (مثال: هاتف سامسونج A15 مستعمل كالجديد بـ 24000 دج، ألوان أسود وأزرق)");
      return;
    }
    setAiError("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "تعذر التحليل");
        return;
      }
      if (data.parsed) applyParsed(data.parsed);
    } catch {
      setAiError("تعذر الاتصال، حاول مجددًا");
    } finally {
      setAiLoading(false);
    }
  }

  async function enhanceDescription() {
    if (!form.name.trim()) {
      setAiError("أدخل اسم المنتج أولًا ليتم تحسين الوصف");
      return;
    }
    setAiError("");
    setEnhancing(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "enhance",
          name: form.name,
          text: aiInput || form.description || form.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "تعذر تحسين الوصف");
        return;
      }
      if (data.description) {
        setForm((prev) => ({ ...prev, description: data.description }));
      }
    } catch {
      setAiError("تعذر الاتصال، حاول مجددًا");
    } finally {
      setEnhancing(false);
    }
  }

  async function handleSave() {
    setSaveError("");

    if (form.name.trim().length < 2) {
      setSaveError("أدخل اسم المنتج");
      return;
    }
    const price = parseFloat(form.price.replace(",", "."));
    if (isNaN(price) || price < 0) {
      setSaveError("أدخل سعرًا صحيحًا بالدينار");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        imageUrl: form.imageUrl,
        options: form.options,
        isActive: form.isActive,
      };

      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "تعذر الحفظ");
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch {
      setSaveError("تعذر الاتصال، حاول مجددًا");
    } finally {
      setSaving(false);
    }
  }

  function updateOption(index: number, patch: Partial<ProductOption>) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => (i === index ? { ...o, ...patch } : o)),
    }));
  }

  function removeOption(index: number) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 font-display text-xl">
            <span className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-primary" />
            </span>
            {editing ? "تعديل المنتج" : "إضافة منتج جديد"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "حدّث بيانات منتجك ثم احفظ التغييرات"
              : "أدخل وصف منتجك نصيًا أو صوتيًا ودع الذكاء الاصطناعي يملأ التفاصيل"}
          </DialogDescription>
        </DialogHeader>

        {/* قسم الذكاء الاصطناعي - للمنتجات الجديدة */}
        {!editing && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-transparent to-gold/15 p-5 space-y-3.5 animate-fade-in">
            <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
            <div className="relative flex items-center gap-2.5 text-sm font-bold">
              <div className="w-8 h-8 rounded-lg bg-gold-soft border border-gold/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gold-foreground" />
              </div>
              <span className="font-display">الإنشاء الذكي</span>
              <Badge variant="outline" className="text-[10px] rounded-full border-gold/40 text-gold-foreground">
                اختياري
              </Badge>
            </div>

            <Textarea
              placeholder="مثال: عندي قفطان تقليدي جزائري مخيط يدويًا، سعره 6500 دج، متوفر بألوان: أخضر، بورڭوندي، وذهبي، والمقاسات من 38 إلى 46..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              rows={3}
              className="bg-card/80 relative"
            />

            <div className="relative flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={analyzeText}
                disabled={aiLoading}
                className="gap-2 rounded-full"
                size="sm"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                تحليل الوصف وتعبئة الحقول
              </Button>

              <Recorder
                onResult={(transcript, parsed) => {
                  if (transcript) setAiInput((prev) => prev || transcript);
                  if (parsed) applyParsed(parsed);
                }}
                onError={(err) => setAiError(err)}
                disabled={aiLoading}
              />
            </div>

            {aiFilled && (
              <p className="relative text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                <Sparkles className="w-3 h-3" />
                تمت تعبئة الحقول تلقائيًا، راجعها وعدّل ما تشاء
              </p>
            )}
            {aiError && (
              <p className="relative text-xs text-destructive">{aiError}</p>
            )}
          </div>
        )}

        <Separator />

        {/* النموذج */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="pw-name">اسم المنتج *</Label>
              <Input
                id="pw-name"
                ref={nameRef}
                placeholder="مثال: ساعة ذكية Apple Watch SE"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-price">السعر (دج) *</Label>
              <Input
                id="pw-price"
                dir="ltr"
                inputMode="decimal"
                className="text-left"
                placeholder="2500"
                value={form.price}
                onChange={(e) =>
                  setForm((p) => ({ ...p, price: e.target.value.replace(/[^\d.,]/g, "") }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pw-desc">وصف المنتج</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={enhanceDescription}
                disabled={enhancing || !form.name.trim()}
                className="text-xs gap-1 text-primary h-7"
              >
                {enhancing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                تحسين بالذكاء الاصطناعي
              </Button>
            </div>
            <Textarea
              id="pw-desc"
              rows={4}
              placeholder="اكتب وصفًا جاذبًا لمنتجك أو دع الذكاء الاصطناعي يكتبه لك..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* الخيارات */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>الخيارات (لون، مقاس، سعة...)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    options: [...p.options, { name: "", choices: [] }],
                  }))
                }
                disabled={form.options.length >= 5}
              >
                <Plus className="w-3 h-3" />
                إضافة خيار
              </Button>
            </div>

            {form.options.length === 0 && (
              <p className="text-xs text-muted-foreground">
                مثال: خيار &quot;اللون&quot; بقيم: أحمر، أزرق، أسود
              </p>
            )}

            <div className="space-y-3">
              {form.options.map((opt, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/70 p-4 space-y-2.5 bg-muted/40 animate-fade-in"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="اسم الخيار (مثال: اللون)"
                      value={opt.name}
                      onChange={(e) => updateOption(idx, { name: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-destructive"
                      onClick={() => removeOption(idx)}
                      aria-label="حذف الخيار"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {opt.choices.map((choice, cIdx) => (
                      <Badge key={cIdx} variant="secondary" className="gap-1 pl-1">
                        {choice}
                        <button
                          type="button"
                          onClick={() =>
                            updateOption(idx, {
                              choices: opt.choices.filter((_, i) => i !== cIdx),
                            })
                          }
                          aria-label={`حذف ${choice}`}
                          className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <OptionChoiceInput
                      onAdd={(value) => {
                        const v = value.trim();
                        if (!v || opt.choices.includes(v)) return;
                        updateOption(idx, { choices: [...opt.choices, v] });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* الصورة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <Label>صورة المنتج</Label>
              <ImagePicker
                value={form.imageUrl}
                onChange={(v) => setForm((p) => ({ ...p, imageUrl: v }))}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-muted/40 p-3.5">
                <div>
                  <Label htmlFor="pw-active" className="cursor-pointer">معروض في المتجر</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    أطفئه لإخفاء المنتج مؤقتًا عن الزبائن
                  </p>
                </div>
                <Switch
                  id="pw-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                />
              </div>
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3.5 py-2.5 animate-fade-in">
              {saveError}
            </p>
          )}

          <div className="flex gap-2.5 justify-start pt-1">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 min-w-36 rounded-full bg-gradient-to-l from-primary to-deep border-0"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {editing ? "حفظ التعديلات" : "نشر المنتج"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-full"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * إدخال سريع لإضافة قيمة جديدة للخيار (Enter أو مغادرة الحقل)
 */
function OptionChoiceInput({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = useState("");

  function submit() {
    if (value.trim()) {
      onAdd(value);
      setValue("");
    }
  }

  return (
    <Input
      placeholder="+ أضف قيمة"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      }}
      onBlur={submit}
      className="h-7 w-28 text-xs"
    />
  );
}
