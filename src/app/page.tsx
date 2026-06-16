import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/product/product-card";
import { CategoryNav } from "@/components/category/category-nav";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";

const cardSelect = {
  include: {
    images: { orderBy: { position: "asc" }, take: 1 },
    _count: { select: { variants: true } },
  },
} as const;

export default async function HomePage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Home");
  const isBn = locale === "bn";

  const [categories, deals, popular] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { nameEn: "asc" },
      include: { children: { orderBy: { nameEn: "asc" } } },
    }),
    prisma.product.findMany({
      where: { published: true, comparePrice: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 8,
      ...cardSelect,
    }),
    prisma.product.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      ...cardSelect,
    }),
  ]);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:py-16">
          <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-xl text-sm opacity-90 sm:text-base">
            {t("heroSubtitle")}
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-2">
            <Link href="/search">{t("shopNow")}</Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[220px_1fr]">
        {/* Persistent category sidebar (desktop) */}
        <aside className="hidden md:block">
          <CategoryNav />
        </aside>

        <div className="min-w-0 space-y-12">
        {/* Categories grouped by parent — mobile only (desktop uses the sidebar) */}
        <section className="space-y-8 md:hidden">
          <h2 className="text-xl font-semibold">{t("shopByCategory")}</h2>
          {categories.map((parent) => (
            <div key={parent.id}>
              <h3 className="mb-3 text-sm font-semibold">
                <Link href={`/category/${parent.slug}`} className="hover:underline">
                  {isBn ? parent.nameBn : parent.nameEn}
                </Link>
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {parent.children.map((c) => (
                  <Link
                    key={c.id}
                    href={`/category/${c.slug}`}
                    className="group flex flex-col items-center gap-2"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-shadow group-hover:shadow-md">
                      {c.image && (
                        <Image
                          src={c.image}
                          alt={isBn ? c.nameBn : c.nameEn}
                          fill
                          sizes="(max-width: 768px) 30vw, 16vw"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span className="text-center text-xs font-medium">
                      {isBn ? c.nameBn : c.nameEn}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Deals */}
        {deals.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold">{t("deals")}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {deals.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* Popular */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("popular")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {popular.map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}
