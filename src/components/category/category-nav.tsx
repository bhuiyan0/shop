import Link from "next/link";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/** Chaldal-style category sidebar: parent categories with their subcategories. */
export async function CategoryNav({ activeSlug }: { activeSlug?: string }) {
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";

  const parents = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { nameEn: "asc" },
    include: { children: { orderBy: { nameEn: "asc" } } },
  });

  return (
    <nav className="space-y-4 text-sm">
      {parents.map((p) => {
        const childActive = p.children.some((c) => c.slug === activeSlug);
        return (
          <div key={p.id}>
            <Link
              href={`/category/${p.slug}`}
              className={cn(
                "block font-semibold",
                (p.slug === activeSlug || childActive) && "text-primary",
              )}
            >
              {isBn ? p.nameBn : p.nameEn}
            </Link>
            <ul className="mt-1 space-y-0.5 border-l pl-3">
              {p.children.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    className={cn(
                      "block py-0.5 text-muted-foreground hover:text-foreground",
                      c.slug === activeSlug && "font-medium text-primary",
                    )}
                  >
                    {isBn ? c.nameBn : c.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
