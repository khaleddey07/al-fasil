"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";

interface ImagePickerProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  aspect?: "square" | "wide";
  disabled?: boolean;
}

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.82;

/**
 * اختيار ورفع صور المنتجات/الشعار
 * يضغط الصورة في المتصفح قبل الإرسال لتوفير المساحة والسرعة
 */
export function ImagePicker({
  value,
  onChange,
  label = "صورة المنتج",
  aspect = "square",
  disabled,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("الملف المختار ليس صورة");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("الصورة كبيرة جدًا (الحد الأقصى 15 ميجابايت)");
      return;
    }

    setProcessing(true);
    try {
      const dataUrl = await resizeImage(file);
      onChange(dataUrl);
    } catch {
      setError("تعذر معالجة الصورة، جرب صورة أخرى");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="space-y-2">
          <div
            className={`relative overflow-hidden rounded-2xl border border-border/80 shadow-soft bg-muted ${
              aspect === "square" ? "aspect-square" : "aspect-video"
            }`}
          >
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || processing}
            >
              تغيير الصورة
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onChange(null)}
              disabled={disabled || processing}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              إزالة
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || processing}
          className={`w-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground transition-all duration-300 hover:border-primary/50 hover:text-primary hover:bg-primary/[0.04] hover:-translate-y-0.5 ${
            aspect === "square" ? "aspect-square" : "aspect-video"
          } disabled:opacity-50`}
        >
          {processing ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">جارٍ ضغط الصورة...</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-8 h-8" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs">اضغط لاختيار صورة من جهازك</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * ضغط الصورة في المتصفح: تصغير للأبعاد القصوى وتحويل إلى JPEG
 */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        let { width, height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas context unavailable");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("failed to load image"));
    };

    img.src = objectUrl;
  });
}
