"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { toPoisha } from "@/lib/money";
import { OrderStatus } from "@/generated/prisma/enums";

export type ActionResult = { ok: boolean; error?: string; id?: string };

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1),
  nameEn: z.string().trim().min(1),
  nameBn: z.string().trim().min(1),
  priceTk: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
});

const imageSchema = z.object({
  id: z.string().optional(),
  url: z.string().trim().url(),
  alt: z.string().trim().optional(),
});

const productSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug"),
  nameEn: z.string().trim().min(1),
  nameBn: z.string().trim().min(1),
  descriptionEn: z.string().trim().optional(),
  descriptionBn: z.string().trim().optional(),
  basePriceTk: z.coerce.number().min(0),
  comparePriceTk: z.coerce.number().min(0).nullable().optional(),
  categoryId: z.string().min(1),
  published: z.boolean(),
  variants: z.array(variantSchema).min(1),
  images: z.array(imageSchema),
});

export type ProductInput = z.input<typeof productSchema>;

export async function saveProduct(input: ProductInput): Promise<ActionResult> {
  await requireAdmin();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const p = parsed.data;

  const base = {
    slug: p.slug,
    nameEn: p.nameEn,
    nameBn: p.nameBn,
    descriptionEn: p.descriptionEn || null,
    descriptionBn: p.descriptionBn || null,
    basePrice: toPoisha(p.basePriceTk),
    comparePrice: p.comparePriceTk ? toPoisha(p.comparePriceTk) : null,
    categoryId: p.categoryId,
    published: p.published,
  };

  try {
    let productId: string;

    if (p.id) {
      const id = p.id;
      productId = id;
      await prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id }, data: base });

        // Variants: update existing, create new, delete removed (only if unreferenced).
        const keepIds = p.variants.filter((v) => v.id).map((v) => v.id!);
        await tx.productVariant.deleteMany({
          where: {
            productId: id,
            id: { notIn: keepIds.length ? keepIds : ["__none__"] },
            orderItems: { none: {} },
            cartItems: { none: {} },
          },
        });
        for (const v of p.variants) {
          const data = {
            sku: v.sku,
            nameEn: v.nameEn,
            nameBn: v.nameBn,
            price: toPoisha(v.priceTk),
            stock: v.stock,
          };
          if (v.id) {
            await tx.productVariant.update({ where: { id: v.id }, data });
          } else {
            await tx.productVariant.create({
              data: { ...data, productId: id },
            });
          }
        }

        // Images: simplest correct approach — replace the set.
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (p.images.length) {
          await tx.productImage.createMany({
            data: p.images.map((img, position) => ({
              productId: id,
              url: img.url,
              alt: img.alt || null,
              position,
            })),
          });
        }
      });
    } else {
      const created = await prisma.product.create({
        data: {
          ...base,
          variants: {
            create: p.variants.map((v) => ({
              sku: v.sku,
              nameEn: v.nameEn,
              nameBn: v.nameBn,
              price: toPoisha(v.priceTk),
              stock: v.stock,
            })),
          },
          images: {
            create: p.images.map((img, position) => ({
              url: img.url,
              alt: img.alt || null,
              position,
            })),
          },
        },
        select: { id: true },
      });
      productId = created.id;
    }

    revalidatePath("/admin/products");
    revalidatePath(`/product/${p.slug}`);
    revalidatePath("/");
    return { ok: true, id: productId };
  } catch (e) {
    // Unique constraint (slug / sku) is the common failure.
    const code = (e as { code?: string }).code;
    if (code === "P2002") return { ok: false, error: "duplicate" };
    throw e;
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.product.delete({ where: { id } });
  } catch (e) {
    // Variants referenced by existing orders block deletion; unpublish instead.
    if ((e as { code?: string }).code === "P2003") {
      return { ok: false, error: "inUse" };
    }
    throw e;
  }
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!(status in OrderStatus)) return { ok: false, error: "invalid" };

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as OrderStatus },
    select: { orderNumber: true },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.orderNumber}`);
  revalidatePath(`/orders/${order.orderNumber}`);
  return { ok: true };
}
