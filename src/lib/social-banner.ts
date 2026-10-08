import sharp from "sharp";

/**
 * مولد البانرات الفاخرة للنشر التلقائي على الشبكات (Auto-Design Engine)
 * يحوّل صورة المنتج الخام إلى بانر إعلاني فاخر 1080×1350 (صيغة فيد فيسبوك/إنستغرام)
 * بإطار ذهبي، شارة "التوصيل لـ 58 ولاية"، السعر بخط ذهبي متدرج ودعوة للطلب.
 * الخط المستخدم Tajawal مثبّت على الخادم (fc-list | grep Tajawal).
 */

export interface BannerProductData {
  imageBuffer: Buffer | null; // صورة المنتج الخام (null = خلفية نصية أنيقة)
  title: string;
  price: number;
  themeColor: string; // مثل '#D4AF37' (ذهب) — يُستخرج من قالب المتجر
  storeName?: string;
}

export const BANNER_WIDTH = 1080;
export const BANNER_HEIGHT = 1350;

/** ترميز نص داخل SVG */
function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** تقصير العنوان ليتسع في سطر البانر */
function clampTitle(title: string, max = 42): string {
  const clean = title.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

/**
 * توليد البانر الفاخر — يُعيد Buffer بصيغة WebP جودة 90%
 */
export async function generateLuxurySocialBanner(
  data: BannerProductData
): Promise<Buffer> {
  const themeColor = /^#[0-9a-fA-F]{6}$/.test(data.themeColor)
    ? data.themeColor
    : "#D4AF37";
  const title = clampTitle(data.title);
  const priceText = `${Math.round(data.price).toLocaleString("en-US")} دج`;
  const storeLine = data.storeName ? `من متجر ${esc(clampTitle(data.storeName, 26))}` : "متجر إلكتروني جزائري";

  // صورة المنتج: 1080×1080 تغطية كاملة — أو خلفية أنيقة إن لا صورة
  let productLayer: Buffer;
  if (data.imageBuffer) {
    productLayer = await sharp(data.imageBuffer)
      .rotate() // تصحيح EXIF
      .resize(BANNER_WIDTH, 1080, { fit: "cover", position: "centre" })
      .toBuffer();
  } else {
    const placeholder = Buffer.from(
      `<svg width="${BANNER_WIDTH}" height="1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="phBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#101014"/>
            <stop offset="55%" stop-color="#14141a"/>
            <stop offset="100%" stop-color="#0a0a0c"/>
          </linearGradient>
        </defs>
        <rect width="1080" height="1080" fill="url(#phBg)"/>
        <circle cx="540" cy="470" r="210" fill="none" stroke="${themeColor}" stroke-opacity="0.35" stroke-width="3"/>
        <circle cx="540" cy="470" r="260" fill="none" stroke="${themeColor}" stroke-opacity="0.15" stroke-width="2"/>
        <text x="540" y="500" font-family="Tajawal" font-size="56" font-weight="700" fill="${themeColor}" text-anchor="middle" direction="rtl">${esc(title)}</text>
        <text x="540" y="580" font-family="Tajawal" font-size="30" fill="#FFFFFF" fill-opacity="0.65" text-anchor="middle" direction="rtl">صورة المنتج قريبًا</text>
      </svg>`
    );
    productLayer = await sharp({ create: { width: BANNER_WIDTH, height: 1080, channels: 4, background: { r: 10, g: 10, b: 12, alpha: 1 } } })
      .composite([{ input: placeholder, top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  // الطبقة الزخرفية SVG — إطار ذهبي + شارة التوصيل + السعر + دعوة للطلب
  const overlay = Buffer.from(
    `<svg width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF5C0"/>
          <stop offset="50%" stop-color="${themeColor}"/>
          <stop offset="100%" stop-color="#AA7C11"/>
        </linearGradient>
        <linearGradient id="fade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0A0A0C" stop-opacity="0"/>
          <stop offset="100%" stop-color="#0A0A0C" stop-opacity="0.92"/>
        </linearGradient>
      </defs>

      <!-- تدرّج دمج ناعم بين الصورة والشريط السفلي -->
      <rect x="0" y="950" width="1080" height="100" fill="url(#fade)"/>
      <!-- الشريط السفلي الداكن للسعر -->
      <rect x="0" y="1050" width="1080" height="300" fill="#0A0A0C" fill-opacity="0.94"/>
      <!-- خط ذهبي فاصل رفيع -->
      <rect x="60" y="1052" width="960" height="3" fill="url(#goldGrad)" rx="1.5"/>

      <!-- إطار ذهبي فاخر حول البانر كاملاً -->
      <rect x="20" y="20" width="1040" height="1310" fill="none" stroke="url(#goldGrad)" stroke-width="8" rx="18"/>

      <!-- شارة التوصيل لـ 58 ولاية (أيقونة شاحنة مرسومة بدل الإيموجي) -->
      <g>
        <rect x="688" y="52" width="340" height="62" rx="31" fill="#0A0A0C" fill-opacity="0.88" stroke="url(#goldGrad)" stroke-width="2.5"/>
        <g transform="translate(1002,83)">
          <!-- شاحنة صغيرة ذهبية -->
          <rect x="-22" y="-10" width="26" height="16" rx="2" fill="${themeColor}"/>
          <path d="M4 -5 L14 -5 L20 2 L20 6 L4 6 Z" fill="${themeColor}"/>
          <circle cx="-14" cy="9" r="4.5" fill="#FFF5C0"/>
          <circle cx="11" cy="9" r="4.5" fill="#FFF5C0"/>
        </g>
        <!-- في النص RTL: start = الحافة اليمنى -->
        <text x="972" y="92" font-family="Tajawal" font-size="26" font-weight="700" fill="${themeColor}" text-anchor="start" direction="rtl">التوصيل لـ 58 ولاية</text>
      </g>

      <!-- اسم المنتج (محاذاة يمين: start في RTL = الحافة اليمنى عند x=1020) -->
      <text x="1020" y="1122" font-family="Tajawal" font-size="30" font-weight="500" fill="#FFFFFF" fill-opacity="0.92" text-anchor="start" direction="rtl">${esc(title)}</text>

      <!-- السعر بخط ذهبي متدرج ضخم -->
      <text x="1020" y="1200" font-family="Tajawal" font-size="64" font-weight="800" fill="url(#goldGrad)" text-anchor="start" direction="rtl">${esc(priceText)}</text>

      <!-- دعوة للطلب (Call to Action) -->
      <text x="1020" y="1268" font-family="Tajawal" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="start" direction="rtl">اطلب الآن والدفع عند الاستلام</text>

      <!-- اسم المتجر (محاذاة يسار: end في RTL = الحافة اليسرى عند x=60) -->
      <text x="60" y="1268" font-family="Tajawal" font-size="22" font-weight="400" fill="${themeColor}" fill-opacity="0.85" text-anchor="end" direction="rtl">${storeLine}</text>
    </svg>`
  );

  return sharp({
    create: {
      width: BANNER_WIDTH,
      height: BANNER_HEIGHT,
      channels: 4,
      background: { r: 10, g: 10, b: 12, alpha: 1 },
    },
  })
    .composite([
      { input: productLayer, top: 0, left: 0 },
      { input: overlay, top: 0, left: 0 },
    ])
    .webp({ quality: 90 })
    .toBuffer();
}
