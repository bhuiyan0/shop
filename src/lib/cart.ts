import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const CART_COOKIE = "bdshop_cart";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

// Shared shape for a cart with everything needed to render a line item.
export const cartInclude = {
  items: {
    orderBy: { id: "asc" },
    include: {
      variant: {
        include: {
          product: {
            select: {
              slug: true,
              nameEn: true,
              nameBn: true,
              images: {
                orderBy: { position: "asc" },
                take: 1,
                select: { url: true, alt: true },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type CartWithItems = NonNullable<
  Awaited<ReturnType<typeof findUserCart>>
>;
export type CartLine = CartWithItems["items"][number];

function findUserCart(userId: string) {
  return prisma.cart.findUnique({
    where: { userId },
    include: cartInclude,
  });
}

/** Read-only: resolve the current cart (user or guest) without mutating cookies. */
export async function getCart(): Promise<CartWithItems | null> {
  const session = await getSession();
  if (session?.userId) return findUserCart(session.userId);

  const guestId = (await cookies()).get(CART_COOKIE)?.value;
  if (!guestId) return null;
  return prisma.cart.findUnique({ where: { guestId }, include: cartInclude });
}

/**
 * Get or create the active cart. Only call from Server Actions / Route Handlers
 * (it may set the guest cookie). On login, merges any guest cart into the user's.
 */
export async function getOrCreateCart(): Promise<CartWithItems> {
  const session = await getSession();
  const store = await cookies();

  if (session?.userId) {
    const userId = session.userId;
    const guestId = store.get(CART_COOKIE)?.value;
    if (guestId) await mergeGuestCart(guestId, userId);
    store.delete(CART_COOKIE);

    return (
      (await findUserCart(userId)) ??
      prisma.cart.create({ data: { userId }, include: cartInclude })
    );
  }

  const guestId = store.get(CART_COOKIE)?.value;
  if (guestId) {
    const existing = await prisma.cart.findUnique({
      where: { guestId },
      include: cartInclude,
    });
    if (existing) return existing;
  }

  const newGuestId = guestId ?? randomUUID();
  store.set(CART_COOKIE, newGuestId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return prisma.cart.create({
    data: { guestId: newGuestId },
    include: cartInclude,
  });
}

/** Fold a guest cart's items into the user's cart, then delete the guest cart. */
async function mergeGuestCart(guestId: string, userId: string): Promise<void> {
  const guestCart = await prisma.cart.findUnique({
    where: { guestId },
    include: { items: true },
  });
  if (!guestCart || guestCart.items.length === 0) {
    if (guestCart) await prisma.cart.delete({ where: { id: guestCart.id } });
    return;
  }

  const userCart =
    (await prisma.cart.findUnique({ where: { userId } })) ??
    (await prisma.cart.create({ data: { userId } }));

  await prisma.$transaction([
    ...guestCart.items.map((item) =>
      prisma.cartItem.upsert({
        where: {
          cartId_variantId: { cartId: userCart.id, variantId: item.variantId },
        },
        update: { quantity: { increment: item.quantity } },
        create: {
          cartId: userCart.id,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      }),
    ),
    prisma.cart.delete({ where: { id: guestCart.id } }),
  ]);
}

/** Subtotal in poisha across all lines. */
export function cartSubtotal(cart: CartWithItems | null): number {
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => sum + i.variant.price * i.quantity, 0);
}

export function cartCount(cart: CartWithItems | null): number {
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}
