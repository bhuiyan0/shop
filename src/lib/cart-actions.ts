"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCart, getOrCreateCart, cartCount } from "@/lib/cart";

export type CartActionResult = { ok: boolean; error?: string; count?: number };

/** Add (or increment) a variant in the active cart, clamped to available stock. */
export async function addToCart(
  variantId: string,
  quantity = 1,
): Promise<CartActionResult> {
  const qty = Math.max(1, Math.floor(quantity));

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true },
  });
  if (!variant) return { ok: false, error: "notFound" };
  if (variant.stock <= 0) return { ok: false, error: "outOfStock" };

  const cart = await getOrCreateCart();
  const existing = cart.items.find((i) => i.variantId === variantId);
  const desired = (existing?.quantity ?? 0) + qty;
  const clamped = Math.min(desired, variant.stock);

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: clamped },
    create: { cartId: cart.id, variantId, quantity: clamped },
  });

  revalidatePath("/cart");
  const fresh = await getCart();
  return {
    ok: true,
    count: cartCount(fresh),
    error: clamped < desired ? "stockLimited" : undefined,
  };
}

/** Set a line's quantity (<=0 removes it). Verifies the line is in the caller's cart. */
export async function setCartItemQuantity(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  const cart = await getCart();
  const line = cart?.items.find((i) => i.id === itemId);
  if (!cart || !line) return { ok: false, error: "notFound" };

  const qty = Math.floor(quantity);
  if (qty <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    const stock = await prisma.productVariant.findUnique({
      where: { id: line.variantId },
      select: { stock: true },
    });
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: Math.min(qty, stock?.stock ?? qty) },
    });
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<CartActionResult> {
  const cart = await getCart();
  const line = cart?.items.find((i) => i.id === itemId);
  if (!cart || !line) return { ok: false, error: "notFound" };

  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/cart");
  return { ok: true };
}
