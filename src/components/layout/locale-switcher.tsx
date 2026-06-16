"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { locales, LOCALE_COOKIE, type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function LocaleSwitcher() {
  const active = useLocale() as Locale;
  const t = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === active) return;
    // Persisted in the browser (no URL prefix) and readable during SSR.
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${ONE_YEAR};samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center rounded-md border text-sm">
      {locales.map((loc) => (
        <Button
          key={loc}
          type="button"
          variant={loc === active ? "secondary" : "ghost"}
          size="sm"
          disabled={pending}
          className="rounded-none first:rounded-l-md last:rounded-r-md px-2"
          onClick={() => setLocale(loc)}
        >
          {loc === "en" ? t("english") : t("bangla")}
        </Button>
      ))}
    </div>
  );
}
