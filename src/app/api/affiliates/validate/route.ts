import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

/**
 * التحقق العام من رمز الإحالة (يستدعيه نموذج الطلب)
 * POST { slug, code } → { valid, name, commission }
 */
export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(`ref-validate:${getClientIp(req)}`, 30, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ valid: false }, { status: 429 });
    }

    const body = await req.json();
    const slug = String(body.slug || "").trim();
    const code = String(body.code || "").trim().toUpperCase();

    if (!slug || !code) {
      return NextResponse.json({ valid: false });
    }

    const store = await db.store.findUnique({ where: { slug } });
    if (!store) {
      return NextResponse.json({ valid: false });
    }

    const affiliate = await db.affiliate.findFirst({
      where: { code, storeId: store.id },
    });

    if (!affiliate) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      name: affiliate.name,
      code: affiliate.code,
      commission: affiliate.commission,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
