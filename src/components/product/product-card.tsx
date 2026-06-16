import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatBDT } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";

export interface ProductCardData {
  slug: string;
  nameEn: string;
  nameBn: string;
  basePrice: number;
  comparePrice: number | null;
  images: { url: string; alt: string | null }[];
  _count: { variants: number };
}

export async function ProductCard({
  product,
  locale,
}: {
  product: ProductCardData;
  locale: Locale;
}) {
  const isBn = locale === "bn";
  const t = await getTranslations("Catalog");
  const image = product.images[0];
  const multi = product._count.variants > 1;
  const price = formatBDT(product.basePrice, { locale });

  return (
    <Link href={`/product/${product.slug}`}>
      <Card className="overflow-hidden pt-0 transition-shadow hover:shadow-md">
        <div className="relative aspect-square bg-muted">
          {image && (
            <Image
              src={image.url}
              alt={image.alt ?? product.nameEn}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover"
            />
          )}
        </div>
        <CardContent className="px-4">
          <h3 className="line-clamp-2 text-sm font-medium">
            {isBn ? product.nameBn : product.nameEn}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-semibold">
              {multi ? t("fromPrice", { price }) : price}
            </span>
            {product.comparePrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatBDT(product.comparePrice, { locale })}
              </span>
            )}
          </div>
          {multi && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("sizeCount", { count: product._count.variants })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
