import Image from "next/image";
import Link from "next/link";
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
}

export function ProductCard({
  product,
  locale,
}: {
  product: ProductCardData;
  locale: Locale;
}) {
  const isBn = locale === "bn";
  const image = product.images[0];

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
              {formatBDT(product.basePrice, { locale })}
            </span>
            {product.comparePrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatBDT(product.comparePrice, { locale })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
