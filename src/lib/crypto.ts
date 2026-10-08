import crypto from "crypto";

// مفتاح التشفير - في الإنتاج يجب وضعه في متغيرات البيئة
const APP_SECRET =
  process.env.APP_SECRET || "souq-dz-app-secret-key-2026-ecommerce";

const KEY = crypto.createHash("sha256").update(APP_SECRET).digest();

/**
 * تشفير كلمة المرور باستخدام scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * التحقق من كلمة المرور
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const hashBuf = crypto.scryptSync(password, salt, 64);
    const storedBuf = Buffer.from(hash, "hex");
    return (
      hashBuf.length === storedBuf.length &&
      crypto.timingSafeEqual(hashBuf, storedBuf)
    );
  } catch {
    return false;
  }
}

/**
 * تشفير المعلومات الحساسة (AES-256-GCM) - لمفاتيح تليجرام مثلًا
 */
export function encryptSecret(plain: string): string {
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
    const encrypted = Buffer.concat([
      cipher.update(plain, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted.toString("base64"),
    ].join(":");
  } catch {
    return "";
  }
}

/**
 * فك تشفير المعلومات الحساسة
 */
export function decryptSecret(payload: string): string {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return "";
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      KEY,
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

/**
 * توليد رمز جلسة آمن
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * توليد رقم طلبية فريد
 */
export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `DZ-${ts}-${rand}`;
}

/**
 * توليد رمز تأكيد العنوان (رابط واتساب الآمن)
 */
export function generateConfirmToken(): string {
  return crypto.randomBytes(16).toString("hex");
}
