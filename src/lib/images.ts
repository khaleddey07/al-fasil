import sharp from "sharp";

/**
 * تحسين الصور على الخادم بمكتبة sharp (متطلب الوثيقة التقنية:
 * Image Asset Handling): تصغير الأبعاد ثم تحويل إلى صيغة WebP
 * بجودة 80% — يقلل حجم صفحات المتجر من ميغابايتات إلى أقل من
 * 150 كيلوبايت للصورة، وهو حاسم للتحميل اللحظي على شبكات 3G/4G.
 */

const DEFAULT_MAX_DIMENSION = 900;
const LOGO_MAX_DIMENSION = 512;
const WEBP_QUALITY = 80;

const DATA_URL_RE =
  /^data:image\/(?:png|jpe?g|webp|gif|bmp|tiff?|avif);base64,(.+)$/i;

/** هل القيمة صورة بصيغة data URL قابلة للمعالجة؟ */
export function isImageDataUrl(value: string): boolean {
  return /^data:image\//i.test(value);
}

/**
 * إعادة ضغط الصورة: sharp → تصغير → WebP بجودة 80%
 * عند أي فشل تُعاد الصورة الأصلية بدل رفض طلب التاجر
 */
export async function optimizeImage(
  dataUrl: string,
  opts?: { maxDimension?: number }
): Promise<string> {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return dataUrl; // ليست base64 — نعيدها كما هي

  const max = opts?.maxDimension ?? DEFAULT_MAX_DIMENSION;

  try {
    const input = Buffer.from(match[1], "base64");
    const output = await sharp(input)
      .rotate() // تصحيح الاتجاه تلقائيًا حسب بيانات EXIF
      .resize(max, max, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    if (output.length > 900_000) return dataUrl; // أمان من الحجم الزائد
    return `data:image/webp;base64,${output.toString("base64")}`;
  } catch {
    return dataUrl; // صورة تالفة أو صيغة غير مدعومة — نُبقي الأصل
  }
}

/** تحسين صورة منتج: حد أقصى 900px → WebP 80% */
export function optimizeProductImage(dataUrl: string): Promise<string> {
  return optimizeImage(dataUrl, { maxDimension: DEFAULT_MAX_DIMENSION });
}

/** تحسين شعار المتجر: حد أقصى 512px → WebP 80% */
export function optimizeStoreLogo(dataUrl: string): Promise<string> {
  return optimizeImage(dataUrl, { maxDimension: LOGO_MAX_DIMENSION });
}
