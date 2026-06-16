"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBox() {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations("Common");
  const [q, setQ] = useState(sp.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("search")}
        className="pl-8"
        aria-label={t("search")}
      />
    </form>
  );
}
