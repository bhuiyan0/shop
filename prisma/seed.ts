import { PrismaClient, Role } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { toPoisha } from "../src/lib/money";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

// Must match the "salt:hash" format expected by src/lib/crypto.ts verifyPassword.
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

async function main() {
  console.log("🌱 Seeding BDShop...");

  // --- Categories -----------------------------------------------------------
  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: { slug: "electronics", nameEn: "Electronics", nameBn: "ইলেকট্রনিক্স" },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: "fashion" },
    update: {},
    create: { slug: "fashion", nameEn: "Fashion", nameBn: "ফ্যাশন" },
  });

  const home = await prisma.category.upsert({
    where: { slug: "home-kitchen" },
    update: {},
    create: { slug: "home-kitchen", nameEn: "Home & Kitchen", nameBn: "হোম ও কিচেন" },
  });

  // --- Products -------------------------------------------------------------
  const products = [
    {
      slug: "wireless-earbuds",
      nameEn: "Wireless Earbuds Pro",
      nameBn: "ওয়্যারলেস ইয়ারবাড প্রো",
      descriptionEn: "Bluetooth 5.3 earbuds with noise cancellation and 30h battery.",
      descriptionBn: "নয়েজ ক্যান্সেলেশন সহ ব্লুটুথ ৫.৩ ইয়ারবাড, ৩০ ঘণ্টা ব্যাটারি।",
      basePrice: toPoisha(2490),
      comparePrice: toPoisha(3200),
      categoryId: electronics.id,
      images: [
        "https://picsum.photos/seed/earbuds-1/800/800",
        "https://picsum.photos/seed/earbuds-2/800/800",
        "https://picsum.photos/seed/earbuds-3/800/800",
      ],
      variants: [
        { sku: "EB-BLK", nameEn: "Black", nameBn: "কালো", price: toPoisha(2490), stock: 50 },
        { sku: "EB-WHT", nameEn: "White", nameBn: "সাদা", price: toPoisha(2490), stock: 35 },
      ],
    },
    {
      slug: "cotton-panjabi",
      nameEn: "Premium Cotton Panjabi",
      nameBn: "প্রিমিয়াম কটন পাঞ্জাবি",
      descriptionEn: "Soft cotton panjabi, perfect for Eid and festivals.",
      descriptionBn: "নরম কটন পাঞ্জাবি, ঈদ ও উৎসবের জন্য উপযুক্ত।",
      basePrice: toPoisha(1850),
      categoryId: fashion.id,
      images: [
        "https://picsum.photos/seed/panjabi-1/800/800",
        "https://picsum.photos/seed/panjabi-2/800/800",
      ],
      variants: [
        { sku: "PJ-M", nameEn: "Medium", nameBn: "মিডিয়াম", price: toPoisha(1850), stock: 40 },
        { sku: "PJ-L", nameEn: "Large", nameBn: "লার্জ", price: toPoisha(1850), stock: 25 },
        { sku: "PJ-XL", nameEn: "XL", nameBn: "এক্সএল", price: toPoisha(1950), stock: 15 },
      ],
    },
    {
      slug: "nonstick-cookware-set",
      nameEn: "Non-stick Cookware Set (5 pcs)",
      nameBn: "নন-স্টিক কুকওয়্যার সেট (৫ পিস)",
      descriptionEn: "Durable non-stick pots and pans for everyday cooking.",
      descriptionBn: "প্রতিদিনের রান্নার জন্য টেকসই নন-স্টিক হাঁড়ি-পাতিল।",
      basePrice: toPoisha(3990),
      comparePrice: toPoisha(4800),
      categoryId: home.id,
      images: [
        "https://picsum.photos/seed/cookware-1/800/800",
        "https://picsum.photos/seed/cookware-2/800/800",
        "https://picsum.photos/seed/cookware-3/800/800",
      ],
      variants: [
        { sku: "CW-STD", nameEn: "Standard", nameBn: "স্ট্যান্ডার্ড", price: toPoisha(3990), stock: 20 },
      ],
    },
  ];

  for (const p of products) {
    const { variants, images, ...data } = p;
    const imageRows = images.map((url, position) => ({
      url,
      alt: p.nameEn,
      position,
    }));
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      // Refresh images on reseed; leave variants (stock) untouched.
      update: { images: { deleteMany: {}, create: imageRows } },
      create: {
        ...data,
        images: { create: imageRows },
        variants: { create: variants },
      },
    });
    console.log(`  ✓ ${product.nameEn}`);
  }

  // --- Admin user -----------------------------------------------------------
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hashPassword(adminPassword);
  await prisma.user.upsert({
    where: { email: "admin@bdshop.test" },
    update: { passwordHash },
    create: {
      email: "admin@bdshop.test",
      name: "Store Admin",
      role: Role.ADMIN,
      passwordHash,
    },
  });
  console.log(`  ✓ Admin: admin@bdshop.test / ${adminPassword}`);

  // --- Sample coupon --------------------------------------------------------
  await prisma.coupon.upsert({
    where: { code: "EID10" },
    update: {},
    create: { code: "EID10", type: "PERCENT", value: 10, minSpend: toPoisha(1000) },
  });

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
