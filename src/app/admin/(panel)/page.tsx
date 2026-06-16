import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatBDT } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import { OrderStatus } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LOW_STOCK = 5;

export default async function AdminDashboard() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Admin");
  const to = await getTranslations("Orders");

  const [orderCount, revenue, productCount, lowStock, recent] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
        },
      }),
      prisma.product.count(),
      prisma.productVariant.count({ where: { stock: { lte: LOW_STOCK } } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const stats = [
    { label: t("stats.orders"), value: orderCount.toString() },
    {
      label: t("stats.revenue"),
      value: formatBDT(revenue._sum.total ?? 0, { locale }),
    },
    { label: t("stats.products"), value: productCount.toString() },
    { label: t("stats.lowStock"), value: lowStock.toString() },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("dashboard")}</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("recentOrders")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{to("none")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {recent.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.orderNumber}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50"
                >
                  <span className="font-mono text-sm">{o.orderNumber}</span>
                  <span className="hidden truncate text-sm text-muted-foreground sm:block">
                    {o.customerName}
                  </span>
                  <Badge variant="secondary">{to(`status.${o.status}`)}</Badge>
                  <span className="text-sm font-medium">
                    {formatBDT(o.total, { locale })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
