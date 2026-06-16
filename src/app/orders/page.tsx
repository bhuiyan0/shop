import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatBDT } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";

export default async function OrdersPage() {
  const user = await requireUser();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Orders");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("myOrders")}</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.orderNumber}`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-mono text-sm font-medium">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("itemCount", { count: order._count.items })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    {t(`status.${order.status}`)}
                  </Badge>
                  <span className="text-sm font-semibold">
                    {formatBDT(order.total, { locale })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
