import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatBDT } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminProductsPage() {
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";
  const t = await getTranslations("Admin");

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: { select: { stock: true } },
      category: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("products")}</h1>
        <Button asChild>
          <Link href="/admin/products/new">{t("newProduct")}</Link>
        </Button>
      </div>

      <ul className="divide-y rounded-lg border">
        {products.map((p) => {
          const stock = p.variants.reduce((s, v) => s + v.stock, 0);
          const img = p.images[0];
          return (
            <li key={p.id}>
              <Link
                href={`/admin/products/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
                  {img && (
                    <Image
                      src={img.url}
                      alt={img.alt ?? p.nameEn}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {isBn ? p.nameBn : p.nameEn}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isBn ? p.category.nameBn : p.category.nameEn} ·{" "}
                    {t("inStock", { count: stock })}
                  </p>
                </div>
                {!p.published && (
                  <Badge variant="outline">{t("draft")}</Badge>
                )}
                <span className="text-sm font-medium">
                  {formatBDT(p.basePrice, { locale })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
