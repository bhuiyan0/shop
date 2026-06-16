import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCart, cartSubtotal } from "@/lib/cart";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import {
  CheckoutForm,
  type CheckoutDefaults,
} from "@/components/checkout/checkout-form";

export default async function CheckoutPage() {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const t = await getTranslations("Checkout");
  const user = await getCurrentUser();

  const address = user
    ? await prisma.address.findFirst({
        where: { userId: user.id },
        orderBy: { isDefault: "desc" },
      })
    : null;

  const defaults: CheckoutDefaults = {
    fullName: address?.fullName ?? user?.name ?? "",
    phone: address?.phone ?? user?.phone ?? "",
    addressLine: address?.addressLine ?? "",
    area: address?.area ?? "",
    city: address?.city ?? "",
    district: address?.district ?? "",
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>
      <CheckoutForm subtotal={cartSubtotal(cart)} defaults={defaults} />
    </main>
  );
}
