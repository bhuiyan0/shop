import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatBDT } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";

export default async function AdminOrdersPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Admin");
  const to = await getTranslations("Orders");

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("orders")}</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{to("none")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.orderNumber}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-medium">{o.orderNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.customerName} · {o.customerPhone}
                  </p>
                </div>
                <Badge variant="secondary">{to(`status.${o.status}`)}</Badge>
                <span className="text-sm font-medium">
                  {formatBDT(o.total, { locale })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
