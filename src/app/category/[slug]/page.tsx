import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/routing";
import { ProductCard } from "@/components/product/product-card";
import { CategoryNav } from "@/components/category/category-nav";

export default async function CategoryPage({
  params,
}: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";
  const [t, tNav] = await Promise.all([
    getTranslations("Catalog"),
    getTranslations("Nav"),
  ]);

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { orderBy: { nameEn: "asc" } },
    },
  });
  if (!category) notFound();

  const isParent = category.children.length > 0;

  // A parent shows products from all its subcategories; a leaf shows its own.
  const products = await prisma.product.findMany({
    where: {
      published: true,
      ...(isParent ? { category: { parentId: category.id } } : { categoryId: category.id }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      _count: { select: { variants: true } },
    },
  });

  const name = (c: { nameEn: string; nameBn: string }) =>
    isBn ? c.nameBn : c.nameEn;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <CategoryNav activeSlug={slug} />
        </aside>

        <div className="min-w-0">
          {/* Breadcrumb */}
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">{tNav("home")}</Link>
            {category.parent && (
              <>
                <span>/</span>
                <Link href={`/category/${category.parent.slug}`} className="hover:underline">
                  {name(category.parent)}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-foreground">{name(category)}</span>
          </nav>

          <h1 className="text-2xl font-semibold">{name(category)}</h1>

          {/* Subcategory tiles (parent only) */}
          {isParent && (
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {category.children.map((c) => (
                <Link key={c.id} href={`/category/${c.slug}`} className="group flex flex-col items-center gap-2">
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-shadow group-hover:shadow-md">
                    {c.image && (
                      <Image src={c.image} alt={name(c)} fill sizes="(max-width:768px) 30vw, 16vw" className="object-cover" />
                    )}
                  </div>
                  <span className="text-center text-xs font-medium">{name(c)}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Products */}
          {products.length === 0 ? (
            <p className="mt-10 text-sm text-muted-foreground">{t("noProducts")}</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
