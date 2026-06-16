import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/dal";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function AdminPanelLayout({
  children,
}: LayoutProps<"/admin">) {
  // Real authorization gate for the whole panel (proxy is only optimistic).
  await requireAdmin();
  const t = await getTranslations("Admin");

  const nav = [
    { href: "/admin", label: t("dashboard") },
    { href: "/admin/products", label: t("products") },
    { href: "/admin/orders", label: t("orders") },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-8">
      <aside className="w-44 shrink-0">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold">{t("title")}</span>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4">
          <LogoutButton variant="ghost" />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
