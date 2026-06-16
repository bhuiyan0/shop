import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCart, toCartLineViews } from "@/lib/cart";
import type { Locale } from "@/i18n/routing";
import { CartView } from "@/components/cart/cart-view";
import { Button } from "@/components/ui/button";

export default async function CartPage() {
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";
  const t = await getTranslations("Cart");

  const cart = await getCart();
  const lines = toCartLineViews(cart, isBn);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>

      {lines.length === 0 ? (
        <div className="rounded-lg border p-10 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          <Button asChild className="mt-4">
            <Link href="/">{t("continueShopping")}</Link>
          </Button>
        </div>
      ) : (
        <CartView lines={lines} />
      )}
    </main>
  );
}
