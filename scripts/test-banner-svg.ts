// اختبار سريع: هل librsvg داخل sharp يرسم العربية بشكل صحيح؟
import sharp from "sharp";

const svg = Buffer.from(`<svg width="600" height="360" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="360" fill="#0A0A0C"/>
  <text x="300" y="80" font-family="Tajawal" font-size="34" font-weight="700" fill="#D4AF37" text-anchor="middle" direction="rtl">قفطان حريم السلطان فاخر</text>
  <text x="300" y="140" font-family="Tajawal" font-size="26" fill="#FFFFFF" text-anchor="middle" direction="rtl">التوصيل لـ 58 ولاية — الدفع عند الاستلام</text>
  <text x="300" y="210" font-family="Tajawal" font-size="40" font-weight="800" fill="#D4AF37" text-anchor="middle" direction="rtl">24,500 دج</text>
  <text x="300" y="270" font-family="Tajawal" font-size="24" fill="#FFFFFF" text-anchor="middle" direction="rtl">اطلب الآن والدفع عند الاستلام</text>
  <text x="300" y="320" font-family="Tajawal" font-size="22" fill="#FFFFFF" text-anchor="middle" direction="rtl">اختبار إيموجي: 🚚 🤝 ✨</text>
</svg>`);

await sharp({ create: { width: 600, height: 360, channels: 4, background: { r: 10, g: 10, b: 12, alpha: 1 } } })
  .composite([{ input: svg, top: 0, left: 0 }])
  .png()
  .toFile("/home/z/my-project/download/banner-svg-test.png");

console.log("OK -> download/banner-svg-test.png");
