"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShoppingCart, Trash2 } from "lucide-react";
import { formatBDT } from "@/lib/money";
import type { CartLineView } from "@/lib/cart";
import { setCartItemQuantity, removeCartItem } from "@/lib/cart-actions";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function CartDrawer({
  lines,
  count,
}: {
  lines: CartLineView[];
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations("Cart");
  const tc = useTranslations("Common");

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  function mutate(fn: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(t("updateFailed"));
        return;
      }
      router.refresh(); // re-pull fresh lines/count from the server header
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={tc("cart")}
        >
          <ShoppingCart className="size-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b">
          <SheetTitle>
            {t("title")}
            {count > 0 && (
              <span className="ml-1 text-muted-foreground">({count})</span>
            )}
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            <Button asChild onClick={() => setOpen(false)}>
              <Link href="/">{t("continueShopping")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-3 p-4">
                  <Link
                    href={`/product/${line.slug}`}
                    onClick={() => setOpen(false)}
                    className="relative aspect-square size-16 shrink-0 overflow-hidden rounded-md bg-muted"
                  >
                    {line.image && (
                      <Image
                        src={line.image.url}
                        alt={line.image.alt}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/product/${line.slug}`}
                      onClick={() => setOpen(false)}
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
                        <span className="w-8 text-center text-sm tabular-nums">
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

                  <div className="shrink-0 text-right text-sm font-medium">
                    {formatBDT(line.unitPrice * line.quantity, { locale })}
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span className="font-medium">
                  {formatBDT(subtotal, { locale })}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("shippingNote")}
              </p>
              <Separator className="my-3" />
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/cart">{t("viewCart")}</Link>
                </Button>
                <Button
                  asChild
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/checkout">{t("checkout")}</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
