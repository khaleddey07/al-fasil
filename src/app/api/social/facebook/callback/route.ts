import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

/**
 * استقبال رد فايسبوك OAuth: تبديل الكود بتوكن صفحة ثم حفظ الحساب تلقائيًا
 * يعمل فقط عند تعريف FACEBOOK_APP_ID/FACEBOOK_APP_SECRET
 */

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const error = req.nextUrl.searchParams.get("error_description");

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (error || !code || !appId || !appSecret || !state) {
    return NextResponse.redirect(
      `${origin}/?social=fb_error&tab=networks`
    );
  }

  try {
    const userId = Buffer.from(state, "base64url").toString("utf8");
    const store = await db.store.findUnique({ where: { userId } });
    if (!store) {
      return NextResponse.redirect(`${origin}/?social=fb_error&tab=networks`);
    }

    // 1) تبديل الكود بتوكن وصول قصير
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(`${origin}/api/social/facebook/callback`)}`
    );
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${origin}/?social=fb_error&tab=networks`);
    }

    // 2) جلب صفحات المستخدم مع توكن الصفحة
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(tokenData.access_token)}`
    );
    const pagesData = (await pagesRes.json()) as {
      data?: {
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: { id: string };
      }[];
    };
    const firstPage = pagesData.data?.[0];
    if (!firstPage) {
      return NextResponse.redirect(
        `${origin}/?social=fb_no_page&tab=networks`
      );
    }

    // 3) حفظ/تحديث الحساب (توكن الصفحة مشفر AES-256-GCM)
    const existing = await db.socialAccount.findFirst({
      where: { storeId: store.id, network: "FACEBOOK_PAGE" },
    });
    const data = {
      displayName: firstPage.name,
      externalId: firstPage.id,
      accessToken: encryptSecret(firstPage.access_token),
    };
    if (existing) {
      await db.socialAccount.update({ where: { id: existing.id }, data });
    } else {
      await db.socialAccount.create({
        data: { storeId: store.id, network: "FACEBOOK_PAGE", ...data },
      });
    }

    // 4) إن كانت الصفحة مرتبطة بحساب إنستغرام احترافي → نربطه تلقائيًا أيضًا
    const igId = firstPage.instagram_business_account?.id;
    if (igId) {
      const igExisting = await db.socialAccount.findFirst({
        where: { storeId: store.id, network: "INSTAGRAM" },
      });
      const igData = {
        displayName: `إنستغرام ${firstPage.name}`,
        externalId: igId,
        accessToken: encryptSecret(firstPage.access_token),
      };
      if (igExisting) {
        await db.socialAccount.update({ where: { id: igExisting.id }, data: igData });
      } else {
        await db.socialAccount.create({
          data: { storeId: store.id, network: "INSTAGRAM", ...igData },
        });
      }
    }

    return NextResponse.redirect(`${origin}/?social=fb_connected&tab=networks`);
  } catch (err) {
    console.error("facebook oauth callback error:", err);
    return NextResponse.redirect(`${origin}/?social=fb_error&tab=networks`);
  }
}
