import { db } from "@/lib/db";
import { generateSessionToken, verifyPassword } from "@/lib/crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "souq_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 يومًا

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * إنشاء جلسة جديدة للمستخدم وحفظ الكوكي
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.session.create({
    data: { token, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return token;
}

/**
 * الحصول على المستخدم الحالي من الجلسة
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  } catch {
    return null;
  }
}

/**
 * تسجيل الخروج وحذف الجلسة
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * التحقق من بيانات تسجيل الدخول
 */
export async function authenticate(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * التحقق من صحة صيغة البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * التحقق من صحة صيغة الرابط (Slug)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,29}$/.test(slug);
}

/**
 * التحقق من رقم هاتف جزائري صالح
 */
export function isValidAlgerianPhone(phone: string): boolean {
  return /^0[5-7][0-9]{8}$/.test(phone.replace(/\s/g, ""));
}
