import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { decryptSecret } from "@/lib/crypto";
import { getLuxTheme } from "@/lib/lux-themes";
import { generateLuxurySocialBanner } from "@/lib/social-banner";
import { generateSocialPostCaption } from "@/lib/social-copywriting";
import {
  publishToFacebookPage,
  publishToInstagram,
  publishToTikTok,
  publishToTelegramChannel,
  publishToWhatsApp,
  resolveTelegramBotToken,
  type SocialNetwork,
} from "@/lib/social-publish";

/**
 * النشر التلقائي على الشبكات (Social Auto-Poster)
 * POST { productId, networks: string[] }
 * → توليد بانر فاخر + نص بيع بالدارجة → نشر على كل شبكة مختارة
 * GET ?productId= → سجل النشر لهذا المنتج
 */

const VALID_NETWORKS = [
  "FACEBOOK_PAGE",
  "INSTAGRAM",
  "TIKTOK",
  "TELEGRAM_CHANNEL",
  "WHATSAPP",
];

/** فك صورة المنتج من data URL إلى Buffer */
function decodeImage(dataUrl: string | null): Buffer | null {
  if (!dataUrl) return null;
  const match = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const productId = req.nextUrl.searchParams.get("productId") || "";
    const posts = await db.socialPost.findMany({
      where: { storeId: store.id, ...(productId ? { productId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        productId: p.productId,
        network: p.network,
        status: p.status,
        error: p.error,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("social publish GET error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const rl = checkRateLimit(
      `social-publish:${user.id}:${getClientIp(req)}`,
      15,
      10 * 60 * 1000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `نشرت الكثير من المنشورات، حاول بعد ${rl.retryAfterSeconds} ثانية` },
        { status: 429 }
      );
    }

    const store = await db.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const productId = String(body.productId || "");
    const networksInput = Array.isArray(body.networks) ? body.networks : [];
    const networks = networksInput
      .map((n: unknown) => String(n))
      .filter((n: string) => VALID_NETWORKS.includes(n)) as SocialNetwork[];

    if (!productId || networks.length === 0) {
      return NextResponse.json(
        { error: "اختر منتجًا وشبكة واحدة على الأقل" },
        { status: 400 }
      );
    }

    const product = await db.product.findFirst({
      where: { id: productId, storeId: store.id },
    });
    if (!product) {
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    const accounts = await db.socialAccount.findMany({
      where: { storeId: store.id },
    });

    const origin = new URL(req.url).origin;
    const landingUrl = `${origin}/?s=${store.slug}`;
    const theme = getLuxTheme(store.luxTheme);
    const themeColor = theme?.styles?.accent || "#D4AF37";

    // ——— 1) البانر الفاخر (Auto-Design Engine) ———
    let bannerBuffer: Buffer;
    try {
      bannerBuffer = await generateLuxurySocialBanner({
        imageBuffer: decodeImage(product.imageUrl),
        title: product.name,
        price: product.price,
        themeColor,
        storeName: store.name,
      });
    } catch (err) {
      console.error("banner generation error:", err);
      return NextResponse.json(
        { error: "تعذر توليد البانر، أعد المحاولة" },
        { status: 500 }
      );
    }

    // ——— 2) نص البيع بالدارجة (Copywriting IA) ———
    let caption = "";
    try {
      caption = await generateSocialPostCaption({
        name: product.name,
        price: product.price,
        description: product.description,
        landingUrl: landingUrl,
      });
    } catch {
      // نص احتياطي داخل الدالة نفسها — لا يُوقف النشر
      caption = "";
    }
    if (!caption) {
      caption = `✨ ${product.name}\n💰 ${Math.round(product.price).toLocaleString("en-US")} دج\n🚚 التوصيل لـ 58 ولاية — الدفع عند الاستلام\n🛒 ${landingUrl}`;
    }

    // الروابط العامة للبانر (لإنستغرام/تيك توك/تليجرام URL-first)
    const bannerWebpUrl = `${origin}/api/social/banner/${product.id}`;
    const bannerJpgUrl = `${origin}/api/social/banner/${product.id}?format=jpg`;

    // ——— 3) النشر على كل شبكة + تسجيل النتيجة ———
    const results: {
      network: SocialNetwork;
      success: boolean;
      message: string;
    }[] = [];

    for (const network of networks) {
      const account = accounts.find((a) => a.network === network);
      let outcome: { ok: boolean; externalId?: string; error?: string };

      if (!account) {
        outcome = {
          ok: false,
          error: "الشبكة غير مربوطة — اربطها من تبويب «الشبكات»",
        };
      } else {
        switch (network) {
          case "FACEBOOK_PAGE": {
            const token = account.accessToken ? decryptSecret(account.accessToken) : "";
            if (!token) {
              outcome = { ok: false, error: "توكن فايسبوك غير موجود — أعد ربط الصفحة" };
              break;
            }
            outcome = await publishToFacebookPage({
              pageId: account.externalId || "",
              pageAccessToken: token,
              bannerBuffer,
              caption,
            });
            break;
          }
          case "INSTAGRAM": {
            const token = account.accessToken ? decryptSecret(account.accessToken) : "";
            if (!token) {
              outcome = { ok: false, error: "توكن إنستغرام غير موجود — أعد ربط الحساب" };
              break;
            }
            outcome = await publishToInstagram({
              igUserId: account.externalId || "",
              accessToken: token,
              imageUrl: bannerJpgUrl,
              caption,
            });
            break;
          }
          case "TIKTOK": {
            const token = account.accessToken ? decryptSecret(account.accessToken) : "";
            if (!token) {
              outcome = { ok: false, error: "توكن تيك توك غير موجود — أعد ربط الحساب" };
              break;
            }
            outcome = await publishToTikTok({
              accessToken: token,
              imageUrl: bannerJpgUrl,
              caption,
            });
            break;
          }
          case "TELEGRAM_CHANNEL": {
            const botToken = resolveTelegramBotToken(
              account.accessToken,
              store.telegramBotToken
            );
            if (!botToken) {
              outcome = {
                ok: false,
                error: "لا يوجد بوت تليجرام — اربط بوت المتجر من الإعدادات أولًا",
              };
              break;
            }
            outcome = await publishToTelegramChannel({
              botToken,
              channelChatId: account.externalId || "",
              bannerBuffer,
              bannerUrl: bannerWebpUrl,
              caption,
            });
            break;
          }
          case "WHATSAPP": {
            const instance = store.ultramsgInstance
              ? decryptSecret(store.ultramsgInstance)
              : "";
            const token = store.ultramsgToken ? decryptSecret(store.ultramsgToken) : "";
            if (!instance || !token) {
              outcome = {
                ok: false,
                error: "مفاتيح UltraMsg غير مربوطة — أضفها من الإعدادات أولًا",
              };
              break;
            }
            outcome = await publishToWhatsApp({
              instance,
              token,
              to: account.externalId || "",
              bannerBuffer,
              caption,
            });
            break;
          }
          default:
            outcome = { ok: false, error: "شبكة غير مدعومة" };
        }
      }

      const success = Boolean(outcome.ok);
      const message = success
        ? "تم النشر بنجاح ✓"
        : outcome.error || "فشل النشر";

      await db.socialPost.create({
        data: {
          storeId: store.id,
          productId: product.id,
          network,
          externalId: outcome.ok ? outcome.externalId ?? null : null,
          status: success ? "PUBLISHED" : "FAILED",
          error: success ? null : message,
          caption,
        },
      });

      results.push({ network, success, message });
    }

    return NextResponse.json({
      results,
      caption,
      bannerUrl: bannerWebpUrl,
    });
  } catch (err) {
    console.error("social publish POST error:", err);
    return NextResponse.json({ error: "حدث خطأ، حاول مجددًا" }, { status: 500 });
  }
}
