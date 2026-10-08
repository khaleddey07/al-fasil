import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseOptions } from "@/app/api/products/route";
import type { DeliveryFeeEntry } from "@/lib/souq-types";

type Params = { params: Promise<{ slug: string }> };

/**
 * واجهة المتجر العام: بيانات المتجر ومنتجاته النشطة
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    const store = await db.store.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    let deliveryFees: Record<string, DeliveryFeeEntry> = {};
    try {
      deliveryFees = store.deliveryFees ? JSON.parse(store.deliveryFees) : {};
    } catch {
      deliveryFees = {};
    }

    return NextResponse.json({
      store: {
        name: store.name,
        slug: store.slug,
        logo: store.logo,
        description: store.description,
        phone: store.phone,
        luxTheme: store.luxTheme,
        defaultHomeFee: store.defaultHomeFee,
        defaultDeskFee: store.defaultDeskFee,
        deliveryFees,
        urgencyEnabled: store.urgencyEnabled,
        urgencyMinutes: store.urgencyMinutes,
        urgencyStock: store.urgencyStock,
        whatsappEnabled: store.whatsappEnabled,
      },
      products: store.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        options: parseOptions(p.options),
        stock: p.stock,
        videoUrl: p.videoStatus === "ready" ? p.videoUrl : null,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("store GET error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
