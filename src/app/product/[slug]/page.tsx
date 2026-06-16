import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { hasPurchased } from "@/lib/review-actions";
import type { Locale } from "@/i18n/routing";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ReviewForm } from "@/components/product/review-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function ProductPage({
  params,
}: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";
  const t = await getTranslations("Product");

  const product = await prisma.product.findFirst({
    where: { slug, published: true },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { price: "asc" } },
      category: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!product) notFound();

  const name = isBn ? product.nameBn : product.nameEn;
  const description = isBn ? product.descriptionBn : product.descriptionEn;
  const reviewCount = product.reviews.length;
  const avgRating =
    reviewCount > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount
      : 0;

  // Review eligibility for the current user.
  const user = await getCurrentUser();
  const myReview = user
    ? await prisma.review.findUnique({
        where: { productId_userId: { productId: product.id, userId: user.id } },
        select: { rating: true, comment: true },
      })
    : null;
  const canReview = user
    ? myReview !== null || (await hasPurchased(user.id, product.id))
    : false;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/category/${product.category.slug}`} className="hover:underline">
          {isBn ? product.category.nameBn : product.category.nameEn}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {product.images[0] && (
              <Image
                src={product.images[0].url}
                alt={product.images[0].alt ?? name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.images.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-md bg-muted"
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? name}
                    fill
                    sizes="20vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">{name}</h1>
            {reviewCount > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                ★ {avgRating.toFixed(1)} ·{" "}
                {t("reviewCount", { count: reviewCount })}
              </p>
            )}
          </div>

          <ProductPurchase variants={product.variants} />
        </div>
      </div>

      {description && (
        <section className="mt-10 max-w-3xl">
          <h2 className="mb-2 text-lg font-semibold">{t("description")}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </section>
      )}

      <Separator className="my-10" />

      <section className="max-w-3xl">
        <h2 className="mb-4 text-lg font-semibold">
          {t("reviews")}
          {reviewCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {reviewCount}
            </Badge>
          )}
        </h2>
        {reviewCount === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
        ) : (
          <ul className="space-y-4">
            {product.reviews.map((r) => (
              <li key={r.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {r.user.name ?? t("anonymous")}
                  </span>
                  <span className="text-sm text-amber-500">
                    {"★".repeat(r.rating)}
                    <span className="text-muted-foreground">
                      {"★".repeat(5 - r.rating)}
                    </span>
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          {!user ? (
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="font-medium underline">
                {t("loginToReview")}
              </Link>
            </p>
          ) : canReview ? (
            <ReviewForm
              productId={product.id}
              slug={product.slug}
              initial={myReview}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("onlyBuyers")}</p>
          )}
        </div>
      </section>
    </main>
  );
}
