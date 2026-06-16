"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { saveProduct, deleteProduct } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface VariantRow {
  id?: string;
  sku: string;
  nameEn: string;
  nameBn: string;
  priceTk: string;
  stock: string;
}
interface ImageRow {
  id?: string;
  url: string;
  alt: string;
}

export interface ProductFormInitial {
  id?: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  basePriceTk: string;
  comparePriceTk: string;
  categoryId: string;
  published: boolean;
  variants: VariantRow[];
  images: ImageRow[];
}

const emptyVariant = (): VariantRow => ({
  sku: "",
  nameEn: "",
  nameBn: "",
  priceTk: "",
  stock: "0",
});

export function ProductForm({
  initial,
  categories,
}: {
  initial: ProductFormInitial;
  categories: { id: string; name: string }[];
}) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const [form, setForm] = useState<ProductFormInitial>(initial);
  const set = <K extends keyof ProductFormInitial>(
    key: K,
    value: ProductFormInitial[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    set(
      "variants",
      form.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    );
  }
  function updateImage(i: number, patch: Partial<ImageRow>) {
    set(
      "images",
      form.images.map((im, idx) => (idx === i ? { ...im, ...patch } : im)),
    );
  }

  function submit() {
    startTransition(async () => {
      const res = await saveProduct({
        id: form.id,
        slug: form.slug,
        nameEn: form.nameEn,
        nameBn: form.nameBn,
        descriptionEn: form.descriptionEn,
        descriptionBn: form.descriptionBn,
        basePriceTk: Number(form.basePriceTk),
        comparePriceTk: form.comparePriceTk ? Number(form.comparePriceTk) : null,
        categoryId: form.categoryId,
        published: form.published,
        variants: form.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          nameEn: v.nameEn,
          nameBn: v.nameBn,
          priceTk: Number(v.priceTk),
          stock: Number(v.stock),
        })),
        images: form.images
          .filter((im) => im.url.trim())
          .map((im) => ({ id: im.id, url: im.url, alt: im.alt })),
      });
      if (!res.ok) {
        toast.error(t(`saveError.${res.error}`));
        return;
      }
      toast.success(t("saved"));
      router.push("/admin/products");
      router.refresh();
    });
  }

  function onDelete() {
    if (!form.id || !confirm(t("confirmDelete"))) return;
    startDelete(async () => {
      const res = await deleteProduct(form.id!);
      if (!res.ok) {
        toast.error(t(`saveError.${res.error}`));
        return;
      }
      toast.success(t("deleted"));
      router.push("/admin/products");
      router.refresh();
    });
  }

  const textarea =
    "w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("nameEn")}>
          <Input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
        </Field>
        <Field label={t("nameBn")}>
          <Input value={form.nameBn} onChange={(e) => set("nameBn", e.target.value)} />
        </Field>
        <Field label={t("slug")}>
          <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="my-product" />
        </Field>
        <Field label={t("category")}>
          <select
            className={textarea}
            value={form.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
          >
            <option value="" disabled>
              —
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("basePrice")}>
          <Input type="number" min={0} value={form.basePriceTk} onChange={(e) => set("basePriceTk", e.target.value)} />
        </Field>
        <Field label={t("comparePrice")}>
          <Input type="number" min={0} value={form.comparePriceTk} onChange={(e) => set("comparePriceTk", e.target.value)} />
        </Field>
        <Field label={t("descriptionEn")}>
          <textarea className={textarea} rows={3} value={form.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
        </Field>
        <Field label={t("descriptionBn")}>
          <textarea className={textarea} rows={3} value={form.descriptionBn} onChange={(e) => set("descriptionBn", e.target.value)} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => set("published", e.target.checked)}
        />
        {t("published")}
      </label>

      <Separator />

      {/* Variants */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("variants")}</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => set("variants", [...form.variants, emptyVariant()])}>
            <Plus className="size-4" /> {t("addVariant")}
          </Button>
        </div>
        <div className="space-y-2">
          {form.variants.map((v, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_5rem_4rem_auto] items-end gap-2">
              <MiniField label="SKU"><Input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} /></MiniField>
              <MiniField label={t("nameEn")}><Input value={v.nameEn} onChange={(e) => updateVariant(i, { nameEn: e.target.value })} /></MiniField>
              <MiniField label={t("nameBn")}><Input value={v.nameBn} onChange={(e) => updateVariant(i, { nameBn: e.target.value })} /></MiniField>
              <MiniField label={t("priceTk")}><Input type="number" min={0} value={v.priceTk} onChange={(e) => updateVariant(i, { priceTk: e.target.value })} /></MiniField>
              <MiniField label={t("stock")}><Input type="number" min={0} value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} /></MiniField>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={form.variants.length <= 1}
                onClick={() => set("variants", form.variants.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Images */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("images")}</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => set("images", [...form.images, { url: "", alt: "" }])}>
            <Plus className="size-4" /> {t("addImage")}
          </Button>
        </div>
        <div className="space-y-2">
          {form.images.map((im, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_auto] items-end gap-2">
              <MiniField label={t("imageUrl")}><Input value={im.url} onChange={(e) => updateImage(i, { url: e.target.value })} placeholder="https://…" /></MiniField>
              <MiniField label={t("imageAlt")}><Input value={im.alt} onChange={(e) => updateImage(i, { alt: e.target.value })} /></MiniField>
              <Button type="button" variant="ghost" size="sm" onClick={() => set("images", form.images.filter((_, idx) => idx !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <div className="flex items-center gap-3">
        <Button type="button" onClick={submit} disabled={pending}>
          {t("save")}
        </Button>
        {form.id && (
          <Button type="button" variant="destructive" onClick={onDelete} disabled={deleting}>
            {t("delete")}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
