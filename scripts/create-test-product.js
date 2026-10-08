const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const db = new PrismaClient();
(async () => {
  const store = await db.store.findUnique({ where: { slug: "nour-store" } });
  const b64 = fs.readFileSync("/tmp/perfume.png").toString("base64");
  const product = await db.product.create({
    data: {
      storeId: store.id,
      name: "عطر شرقي فاخر — رويال أونيكس",
      description: "عطر شرقي بلمسة العود والمسك، ثبات يدوم 12 ساعة",
      price: 8500,
      imageUrl: `data:image/png;base64,${b64}`,
      stock: 3,
    },
  });
  console.log("created:", product.id, "stock:", product.stock);
  await db.$disconnect();
})();
