"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { OrderStatus } from "@/generated/prisma/enums";

export type ReviewState = { ok: boolean; error?: string };

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** True if the user has an order (other than cancelled) containing this product. */
export async function hasPurchased(
  userId: string,
  productId: string,
): Promise<boolean> {
  const item = await prisma.orderItem.findFirst({
    where: {
      variant: { productId },
      order: { userId, status: { not: OrderStatus.CANCELLED } },
    },
    select: { id: true },
  });
  return item !== null;
}

export async function submitReview(input: {
  productId: string;
  slug: string;
  rating: number;
  comment?: string;
}): Promise<ReviewState> {
  const user = await requireUser();

  const parsed = reviewSchema.safeParse({
    rating: input.rating,
    comment: input.comment,
  });
  if (!parsed.success) return { ok: false, error: "invalid" };

  if (!(await hasPurchased(user.id, input.productId))) {
    return { ok: false, error: "notPurchased" };
  }

  await prisma.review.upsert({
    where: { productId_userId: { productId: input.productId, userId: user.id } },
    update: { rating: parsed.data.rating, comment: parsed.data.comment || null },
    create: {
      productId: input.productId,
      userId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
  });

  revalidatePath(`/product/${input.slug}`);
  return { ok: true };
}

export async function deleteReview(input: {
  productId: string;
  slug: string;
}): Promise<ReviewState> {
  const user = await requireUser();

  // deleteMany scopes by userId, so a user can only remove their own review.
  await prisma.review.deleteMany({
    where: { productId: input.productId, userId: user.id },
  });

  revalidatePath(`/product/${input.slug}`);
  return { ok: true };
}
