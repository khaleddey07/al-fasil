// توليد أيقونات PWA من شعار SVG باستخدام sharp
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e7a5f"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- أيقونة متجر -->
  <g fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
    <path d="M120 200 L136 132 a16 16 0 0 1 15.5-12 h209 a16 16 0 0 1 15.5 12 L392 200"/>
    <path d="M120 200 a48 48 0 0 0 96 0 a48 48 0 0 0 96 0 a48 48 0 0 0 80 0"/>
    <path d="M136 236 v132 a24 24 0 0 0 24 24 h192 a24 24 0 0 0 24-24 V236"/>
    <path d="M212 392 v-88 a12 12 0 0 1 12-12 h64 a12 12 0 0 1 12 12 v88"/>
  </g>
</svg>`;

const iconsDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(iconsDir, { recursive: true });

async function generate() {
  for (const size of [192, 512]) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
    console.log(`generated icon-${size}.png`);
  }
  // apple touch icon
  await sharp(Buffer.from(svg))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, "apple-touch-icon.png"));
  console.log("generated apple-touch-icon.png");
  // favicon
  await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, "favicon-32.png"));
  console.log("generated favicon-32.png");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
