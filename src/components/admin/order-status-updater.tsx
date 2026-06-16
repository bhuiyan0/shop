"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateOrderStatus } from "@/lib/admin-actions";
import { Label } from "@/components/ui/label";

export function OrderStatusUpdater({
  orderId,
  current,
  options,
}: {
  orderId: string;
  current: string;
  options: { value: string; label: string }[];
}) {
  const t = useTranslations("Admin");
  const [status, setStatus] = useState(current);
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, next);
      if (!res.ok) {
        setStatus(prev);
        toast.error(t("saveError.invalid"));
        return;
      }
      toast.success(t("statusUpdated"));
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="status">{t("orderStatus")}</Label>
      <select
        id="status"
        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={status}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
