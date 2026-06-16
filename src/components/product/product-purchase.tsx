"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { formatBDT } from "@/lib/money";
import { addToCart } from "@/lib/cart-actions";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface PurchaseVariant {
  id: string;
  nameEn: string;
  nameBn: string;
  price: number;
  stock: number;
}

export function ProductPurchase({ variants }: { variants: PurchaseVariant[] }) {
  const locale = useLocale() as Locale;
  const isBn = locale === "bn";
  const t = useTranslations("Product");
  const tc = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);

  const selected = variants.find((v) => v.id === variantId) ?? firstInStock;
  const maxQty = selected?.stock ?? 0;
  const soldOut = maxQty <= 0;

  function handleAddToCart() {
    if (!selected) return;
    startTransition(async () => {
      const res = await addToCart(selected.id, qty);
      if (!res.ok) {
        toast.error(tc("addToCart"), {
          description: t(`cartError.${res.error}`),
        });
        return;
      }
      toast.success(tc("addToCart"), { description: t("addedToCart") });
      router.refresh(); // update the header cart count
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-2xl font-semibold">
        {selected ? formatBDT(selected.price, { locale }) : null}
      </p>

      {variants.length > 1 && (
        <div className="space-y-2">
          <Label>{t("selectVariant")}</Label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <Button
                key={v.id}
                type="button"
                size="sm"
                variant={v.id === variantId ? "default" : "outline"}
                disabled={v.stock <= 0}
                onClick={() => {
                  setVariantId(v.id);
                  setQty(1);
                }}
              >
                {isBn ? v.nameBn : v.nameEn}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t("quantity")}</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={soldOut || qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </Button>
            <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={soldOut || qty >= maxQty}
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            >
              +
            </Button>
          </div>
          {!soldOut && maxQty <= 10 && (
            <span className="text-xs text-muted-foreground">
              {t("onlyLeft", { count: maxQty })}
            </span>
          )}
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={soldOut || pending}
        onClick={handleAddToCart}
      >
        {soldOut ? tc("outOfStock") : tc("addToCart")}
      </Button>
    </div>
  );
}
