import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * ربط صفحة فايسبوك بنقرة واحدة (OAuth 2.0 — Zero-Tech UX)
 * يعمل فقط عند تعريف FACEBOOK_APP_ID و FACEBOOK_APP_SECRET في البيئة؛
 * وإلا يُعاد للواجهة نموذج الربط اليدوي الموجّه (خطوات بسيطة).
 * GET /api/social/facebook/oauth → { redirectUrl } أو { available: false }
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json({
      available: false,
      hintAr:
        "الربط بنقرة واحدة غير مفعّل على المنصة بعد — استخدم الربط اليدوي الموجّه (دقيقة واحدة)",
    });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/social/facebook/callback`;
  const state = Buffer.from(user.id).toString("base64url");

  const dialogUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  dialogUrl.searchParams.set("client_id", appId);
  dialogUrl.searchParams.set("redirect_uri", redirectUri);
  dialogUrl.searchParams.set("state", state);
  dialogUrl.searchParams.set("response_type", "code");
  dialogUrl.searchParams.set(
    "scope",
    "pages_show_list,pages_manage_posts,pages_read_engagement"
  );

  return NextResponse.json({ available: true, redirectUrl: dialogUrl.toString() });
}
