"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const selectCls =
  "rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ProductFilters({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("Search");

  const [minPrice, setMinPrice] = useState(sp.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(sp.get("maxPrice") ?? "");

  function update(patch: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page"); // any filter change resets paging
    router.push(`/search?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams();
    const q = sp.get("q");
    if (q) params.set("q", q);
    setMinPrice("");
    setMaxPrice("");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("category")}</Label>
        <select
          className={selectCls}
          value={sp.get("category") ?? ""}
          onChange={(e) => update({ category: e.target.value })}
        >
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("sort")}</Label>
        <select
          className={selectCls}
          value={sp.get("sort") ?? "new"}
          onChange={(e) => update({ sort: e.target.value === "new" ? "" : e.target.value })}
        >
          <option value="new">{t("sortNew")}</option>
          <option value="price_asc">{t("sortPriceAsc")}</option>
          <option value="price_desc">{t("sortPriceDesc")}</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("priceRange")} (৳)</Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={minPrice}
            placeholder={t("min")}
            className="w-24"
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => update({ minPrice })}
            onKeyDown={(e) => e.key === "Enter" && update({ minPrice })}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={maxPrice}
            placeholder={t("max")}
            className="w-24"
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => update({ maxPrice })}
            onKeyDown={(e) => e.key === "Enter" && update({ maxPrice })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 py-2 text-sm">
        <input
          type="checkbox"
          checked={sp.get("inStock") === "1"}
          onChange={(e) => update({ inStock: e.target.checked ? "1" : "" })}
        />
        {t("inStock")}
      </label>

      <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
        {t("clear")}
      </Button>
    </div>
  );
}
