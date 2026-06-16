import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { toTaka } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import { ProductForm } from "@/components/admin/product-form";

const tk = (poisha: number | null) =>
  poisha == null ? "" : String(toTaka(poisha));

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";
  const t = await getTranslations("Admin");

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { price: "asc" } },
        images: { orderBy: { position: "asc" } },
      },
    }),
    prisma.category.findMany({ orderBy: { nameEn: "asc" } }),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("editProduct")}</h1>
      <ProductForm
        categories={categories.map((c) => ({
          id: c.id,
          name: isBn ? c.nameBn : c.nameEn,
        }))}
        initial={{
          id: product.id,
          slug: product.slug,
          nameEn: product.nameEn,
          nameBn: product.nameBn,
          descriptionEn: product.descriptionEn ?? "",
          descriptionBn: product.descriptionBn ?? "",
          basePriceTk: tk(product.basePrice),
          comparePriceTk: tk(product.comparePrice),
          categoryId: product.categoryId,
          published: product.published,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            nameEn: v.nameEn,
            nameBn: v.nameBn,
            priceTk: tk(v.price),
            stock: String(v.stock),
          })),
          images: product.images.map((im) => ({
            id: im.id,
            url: im.url,
            alt: im.alt ?? "",
          })),
        }}
      />
    </div>
  );
}
