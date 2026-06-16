import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { toPoisha } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import type { Prisma } from "@/generated/prisma/client";
import { ProductCard } from "@/components/product/product-card";
import { ProductFilters } from "@/components/search/product-filters";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const sp = await searchParams;
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";
  const t = await getTranslations("Search");

  const q = str(sp.q).trim();
  const category = str(sp.category);
  const sort = str(sp.sort);
  const inStock = str(sp.inStock) === "1";
  const minTk = Number(str(sp.minPrice));
  const maxTk = Number(str(sp.maxPrice));
  const page = Math.max(1, Number(str(sp.page)) || 1);

  const where: Prisma.ProductWhereInput = { published: true };
  if (q) {
    where.OR = [
      { nameEn: { contains: q, mode: "insensitive" } },
      { nameBn: { contains: q } },
      { descriptionEn: { contains: q, mode: "insensitive" } },
      { descriptionBn: { contains: q } },
    ];
  }
  if (category) where.category = { slug: category };
  if (inStock) where.variants = { some: { stock: { gt: 0 } } };
  if (minTk > 0 || maxTk > 0) {
    where.basePrice = {
      ...(minTk > 0 ? { gte: toPoisha(minTk) } : {}),
      ...(maxTk > 0 ? { lte: toPoisha(maxTk) } : {}),
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { basePrice: "asc" }
      : sort === "price_desc"
        ? { basePrice: "desc" }
        : { createdAt: "desc" };

  const [total, products, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        _count: { select: { variants: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { nameEn: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const s = str(v);
      if (s && k !== "page") params.set(k, s);
    }
    params.set("page", String(n));
    return `/search?${params.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        {q ? t("resultsFor", { q }) : t("title")}
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("results", { count: total })}
      </p>

      <ProductFilters
        categories={categories.map((c) => ({
          slug: c.slug,
          name: isBn ? c.nameBn : c.nameEn,
        }))}
      />

      {products.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link href={pageHref(page - 1)} aria-disabled={page <= 1}>
              {t("prev")}
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pageOf", { page, total: totalPages })}
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
          >
            <Link href={pageHref(page + 1)} aria-disabled={page >= totalPages}>
              {t("next")}
            </Link>
          </Button>
        </div>
      )}
    </main>
  );
}
