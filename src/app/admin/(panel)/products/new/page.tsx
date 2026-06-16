import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/routing";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";
  const t = await getTranslations("Admin");

  const categories = await prisma.category.findMany({ orderBy: { nameEn: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("newProduct")}</h1>
      <ProductForm
        categories={categories.map((c) => ({
          id: c.id,
          name: isBn ? c.nameBn : c.nameEn,
        }))}
        initial={{
          slug: "",
          nameEn: "",
          nameBn: "",
          descriptionEn: "",
          descriptionBn: "",
          basePriceTk: "",
          comparePriceTk: "",
          categoryId: "",
          published: true,
          variants: [
            { sku: "", nameEn: "", nameBn: "", priceTk: "", stock: "0" },
          ],
          images: [],
        }}
      />
    </div>
  );
}
