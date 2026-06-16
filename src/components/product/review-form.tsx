"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { submitReview, deleteReview } from "@/lib/review-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface ExistingReview {
  rating: number;
  comment: string | null;
}

export function ReviewForm({
  productId,
  slug,
  initial,
}: {
  productId: string;
  slug: string;
  initial: ExistingReview | null;
}) {
  const t = useTranslations("Product");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const editing = initial !== null;

  function submit() {
    if (rating < 1) {
      toast.error(t("reviewError.invalid"));
      return;
    }
    startTransition(async () => {
      const res = await submitReview({ productId, slug, rating, comment });
      if (!res.ok) {
        toast.error(t(`reviewError.${res.error}`));
        return;
      }
      toast.success(t(editing ? "reviewUpdated" : "reviewSubmitted"));
      router.refresh();
    });
  }

  function onDelete() {
    startDelete(async () => {
      const res = await deleteReview({ productId, slug });
      if (!res.ok) {
        toast.error(t(`reviewError.${res.error}`));
        return;
      }
      setRating(0);
      setComment("");
      toast.success(t("reviewDeleted"));
      router.refresh();
    });
  }

  const textarea =
    "w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">
        {editing ? t("editReview") : t("writeReview")}
      </h3>

      <div className="mt-3 space-y-2">
        <Label>{t("yourRating")}</Label>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="p-0.5"
            >
              <Star
                className={
                  n <= (hover || rating)
                    ? "size-6 fill-amber-400 text-amber-400"
                    : "size-6 text-muted-foreground"
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Label htmlFor="comment">{t("comment")}</Label>
        <textarea
          id="comment"
          className={textarea}
          rows={3}
          maxLength={1000}
          value={comment}
          placeholder={t("commentPlaceholder")}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button type="button" onClick={submit} disabled={pending}>
          {editing ? t("updateReview") : t("submitReview")}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={deleting}
          >
            {t("deleteReview")}
          </Button>
        )}
      </div>
    </div>
  );
}
