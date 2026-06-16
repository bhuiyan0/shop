import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product/product-card";
import type { Locale } from "@/i18n/routing";

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations("Home");
  const isBn = locale === "bn";

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { published: true },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.category.findMany({ where: { parentId: null } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">{t("shopByCategory")}</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`}>
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                {isBn ? c.nameBn : c.nameEn}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">{t("featured")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} locale={locale as Locale} />
          ))}
        </div>
      </section>
    </main>
  );
}
