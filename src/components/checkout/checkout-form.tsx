"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { placeOrder, type CheckoutState } from "@/lib/checkout-actions";
import { formatBDT } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Mirrors shippingFeeFor() on the server (poisha): ৳60 inside Dhaka, ৳120 elsewhere.
const SHIPPING_DHAKA = 6000;
const SHIPPING_OUTSIDE = 12000;

export interface CheckoutDefaults {
  fullName: string;
  phone: string;
  addressLine: string;
  area: string;
  city: string;
  district: string;
}

export function CheckoutForm({
  subtotal,
  defaults,
}: {
  subtotal: number;
  defaults: CheckoutDefaults;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Checkout");
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    placeOrder,
    {},
  );

  const [district, setDistrict] = useState(defaults.district);
  const shipping = /dhaka/i.test(district.trim())
    ? SHIPPING_DHAKA
    : SHIPPING_OUTSIDE;
  const total = subtotal + shipping;

  const fieldError = (name: string) =>
    state.fieldErrors?.[name] ? (
      <p className="text-xs text-destructive">{t("required")}</p>
    ) : null;

  return (
    <form action={action} className="grid gap-8 md:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div>
          <h2 className="mb-3 font-semibold">{t("shippingAddress")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">{t("fullName")}</Label>
              <Input id="fullName" name="fullName" defaultValue={defaults.fullName} required />
              {fieldError("fullName")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" name="phone" type="tel" placeholder="01XXXXXXXXX" defaultValue={defaults.phone} required />
              {fieldError("phone")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">{t("district")}</Label>
              <Input
                id="district"
                name="district"
                defaultValue={defaults.district}
                onChange={(e) => setDistrict(e.target.value)}
                required
              />
              {fieldError("district")}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine">{t("address")}</Label>
              <Input id="addressLine" name="addressLine" defaultValue={defaults.addressLine} required />
              {fieldError("addressLine")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">{t("area")}</Label>
              <Input id="area" name="area" defaultValue={defaults.area} required />
              {fieldError("area")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t("city")}</Label>
              <Input id="city" name="city" defaultValue={defaults.city} required />
              {fieldError("city")}
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-semibold">{t("paymentMethod")}</h2>
          <label className="flex items-center gap-3 rounded-md border p-3">
            <input type="radio" name="payment" value="COD" defaultChecked />
            <span className="text-sm">{t("cod")}</span>
          </label>
          <label className="mt-2 flex cursor-not-allowed items-center gap-3 rounded-md border p-3 opacity-50">
            <input type="radio" name="payment" value="SSLCOMMERZ" disabled />
            <span className="text-sm">{t("online")}</span>
            <span className="ml-auto text-xs text-muted-foreground">{t("comingSoon")}</span>
          </label>
        </div>
      </div>

      <aside className="h-fit rounded-lg border p-4">
        <h2 className="font-semibold">{t("orderSummary")}</h2>
        <Separator className="my-3" />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span>{formatBDT(subtotal, { locale })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("shipping")}</span>
            <span>{formatBDT(shipping, { locale })}</span>
          </div>
        </div>
        <Separator className="my-3" />
        <div className="flex justify-between font-semibold">
          <span>{t("total")}</span>
          <span>{formatBDT(total, { locale })}</span>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="couponCode">{t("coupon")}</Label>
          <Input id="couponCode" name="couponCode" placeholder="EID10" />
        </div>

        {state.error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {t(`errors.${state.error}`)}
          </p>
        )}

        <Button type="submit" size="lg" className="mt-4 w-full" disabled={pending}>
          {t("placeOrder")}
        </Button>
      </aside>
    </form>
  );
}
