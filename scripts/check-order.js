const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { orderNumber: true, customerPhone: true, riskLevel: true, commission: true, affiliateId: true, confirmToken: true, total: true },
  });
  console.log(JSON.stringify(orders, null, 1));
  const affiliates = await db.affiliate.findMany({ select: { code: true, commission: true, totalEarned: true } });
  console.log("Affiliates:", JSON.stringify(affiliates));
  await db.$disconnect();
})();
