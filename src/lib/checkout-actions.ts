"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCart, cartSubtotal } from "@/lib/cart";
import { getSession } from "@/lib/session";
import { normalizeBdPhone } from "@/lib/phone";
import { toPoisha } from "@/lib/money";
import { DiscountType } from "@/generated/prisma/enums";

export type CheckoutState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const SHIPPING_DHAKA = toPoisha(60);
const SHIPPING_OUTSIDE = toPoisha(120);

function shippingFeeFor(district: string): number {
  return /dhaka/i.test(district.trim()) ? SHIPPING_DHAKA : SHIPPING_OUTSIDE;
}

function genOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `BD-${ts}-${rand}`;
}

const addressSchema = z.object({
  fullName: z.string().trim().min(2),
  addressLine: z.string().trim().min(4),
  area: z.string().trim().min(1),
  city: z.string().trim().min(1),
  district: z.string().trim().min(1),
});

// Thrown inside the transaction to abort with a translatable reason.
class CheckoutError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** Compute a coupon discount (poisha) or throw CheckoutError if the code is invalid. */
function couponDiscount(
  coupon: {
    type: DiscountType;
    value: number;
    minSpend: number;
    maxUses: number | null;
    usedCount: number;
    expiresAt: Date | null;
    active: boolean;
  } | null,
  subtotal: number,
): number {
  if (!coupon || !coupon.active) throw new CheckoutError("couponInvalid");
  if (coupon.expiresAt && coupon.expiresAt < new Date())
    throw new CheckoutError("couponExpired");
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    throw new CheckoutError("couponUsedUp");
  if (subtotal < coupon.minSpend) throw new CheckoutError("couponMinSpend");

  const raw =
    coupon.type === DiscountType.PERCENT
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;
  return Math.min(raw, subtotal);
}

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) return { error: "emptyCart" };

  const parsed = addressSchema.safeParse({
    fullName: formData.get("fullName"),
    addressLine: formData.get("addressLine"),
    area: formData.get("area"),
    city: formData.get("city"),
    district: formData.get("district"),
  });
  const phone = normalizeBdPhone(String(formData.get("phone") ?? ""));

  if (!parsed.success || !phone) {
    const fieldErrors = parsed.success
      ? {}
      : z.flattenError(parsed.error).fieldErrors;
    return {
      error: "invalidAddress",
      fieldErrors: {
        ...fieldErrors,
        ...(phone ? {} : { phone: ["invalid"] }),
      },
    };
  }

  const couponCode = String(formData.get("couponCode") ?? "")
    .trim()
    .toUpperCase();

  const subtotal = cartSubtotal(cart);
  const shippingFee = shippingFeeFor(parsed.data.district);
  const session = await getSession();

  const items = cart.items.map((line) => ({
    variantId: line.variantId,
    quantity: line.quantity,
    unitPrice: line.variant.price,
    nameEn: `${line.variant.product.nameEn} (${line.variant.nameEn})`,
    nameBn: `${line.variant.product.nameBn} (${line.variant.nameBn})`,
  }));

  let orderNumber: string;
  try {
    orderNumber = await prisma.$transaction(async (tx) => {
      // Atomically decrement stock, guarding against oversell.
      for (const item of items) {
        const res = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (res.count === 0) throw new CheckoutError("stockChanged");
      }

      let discount = 0;
      let couponId: string | undefined;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode },
        });
        discount = couponDiscount(coupon, subtotal);
        couponId = coupon!.id;
        await tx.coupon.update({
          where: { id: coupon!.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const total = subtotal + shippingFee - discount;
      const order = await tx.order.create({
        data: {
          orderNumber: genOrderNumber(),
          userId: session?.userId ?? null,
          subtotal,
          shippingFee,
          discount,
          total,
          couponId,
          customerName: parsed.data.fullName,
          customerPhone: phone,
          addressLine: parsed.data.addressLine,
          area: parsed.data.area,
          city: parsed.data.city,
          district: parsed.data.district,
          items: { create: items },
          payment: { create: { method: "COD", amount: total } },
        },
        select: { orderNumber: true },
      });

      // Clear the cart (items cascade).
      await tx.cart.delete({ where: { id: cart.id } });
      return order.orderNumber;
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.code };
    throw e;
  }

  redirect(`/orders/${orderNumber}`);
}
