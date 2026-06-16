"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatBDT } from "@/lib/money";
import { setCartItemQuantity, removeCartItem } from "@/lib/cart-actions";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export interface CartLineView {
  id: string;
  slug: string;
  name: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  stock: number;
  image: { url: string; alt: string } | null;
}

export function CartView({ lines }: { lines: CartLineView[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Cart");
  const [pending, startTransition] = useTransition();

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  function mutate(fn: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(t("updateFailed"));
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <ul className="divide-y rounded-lg border">
        {lines.map((line) => (
          <li key={line.id} className="flex gap-4 p-4">
            <Link
              href={`/product/${line.slug}`}
              className="relative aspect-square size-20 shrink-0 overflow-hidden rounded-md bg-muted"
            >
              {line.image && (
                <Image
                  src={line.image.url}
                  alt={line.image.alt}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={`/product/${line.slug}`}
                className="line-clamp-1 text-sm font-medium hover:underline"
              >
                {line.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {line.variantName}
              </span>

              <div className="mt-auto flex items-center gap-2 pt-2">
                <div className="flex items-center rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending || line.quantity <= 1}
                    onClick={() =>
                      mutate(() =>
                        setCartItemQuantity(line.id, line.quantity - 1),
                      )
                    }
                  >
                    −
                  </Button>
                  <span className="w-9 text-center text-sm tabular-nums">
                    {line.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending || line.quantity >= line.stock}
                    onClick={() =>
                      mutate(() =>
                        setCartItemQuantity(line.id, line.quantity + 1),
                      )
                    }
                  >
                    +
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => mutate(() => removeCartItem(line.id))}
                  aria-label={t("remove")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <div className="text-right text-sm font-medium">
              {formatBDT(line.unitPrice * line.quantity, { locale })}
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-lg border p-4">
        <h2 className="font-semibold">{t("summary")}</h2>
        <Separator className="my-3" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("subtotal")}</span>
          <span className="font-medium">{formatBDT(subtotal, { locale })}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("shippingNote")}</p>
        <Button asChild size="lg" className="mt-4 w-full" disabled={pending}>
          <Link href="/checkout">{t("checkout")}</Link>
        </Button>
      </aside>
    </div>
  );
}
