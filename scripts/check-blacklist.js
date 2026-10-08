const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  const bl = await db.blacklistedCustomer.findMany();
  console.log("Blacklist:", JSON.stringify(bl.map(b => ({phone: b.phone, failed: b.failedDeliveries, note: b.note}))));
  const o = await db.order.findFirst({ where: { orderNumber: "DZ-MUY7QPQO-25CE" }, select: { status: true } });
  console.log("Order status:", o?.status);
  await db.$disconnect();
})();
