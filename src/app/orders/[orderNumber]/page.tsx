import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatBDT } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function OrderPage({
  params,
}: PageProps<"/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";
  const t = await getTranslations("Orders");

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, payment: true },
  });
  if (!order) notFound();

  // Orders attached to an account are private to that account; guest orders
  // (no userId) are viewable by anyone holding the order number.
  if (order.userId) {
    const user = await getCurrentUser();
    if (user?.id !== order.userId) notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="rounded-lg border p-6">
        <h1 className="text-xl font-semibold">{t("thankYou")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("orderNumber")}:{" "}
          <span className="font-mono font-medium text-foreground">
            {order.orderNumber}
          </span>
        </p>
        <Badge className="mt-3" variant="secondary">
          {t(`status.${order.status}`)}
        </Badge>

        <Separator className="my-5" />

        <ul className="space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {isBn ? item.nameBn : item.nameEn}{" "}
                <span className="text-muted-foreground">× {item.quantity}</span>
              </span>
              <span className="shrink-0">
                {formatBDT(item.unitPrice * item.quantity, { locale })}
              </span>
            </li>
          ))}
        </ul>

        <Separator className="my-5" />

        <dl className="space-y-1 text-sm">
          <Row label={t("subtotal")} value={formatBDT(order.subtotal, { locale })} />
          <Row label={t("shipping")} value={formatBDT(order.shippingFee, { locale })} />
          {order.discount > 0 && (
            <Row
              label={t("discount")}
              value={`− ${formatBDT(order.discount, { locale })}`}
            />
          )}
          <div className="flex justify-between pt-2 text-base font-semibold">
            <dt>{t("total")}</dt>
            <dd>{formatBDT(order.total, { locale })}</dd>
          </div>
        </dl>

        <Separator className="my-5" />

        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t("deliverTo")}</p>
          <p>{order.customerName} · {order.customerPhone}</p>
          <p>
            {order.addressLine}, {order.area}, {order.city}, {order.district}
          </p>
          <p className="mt-2">
            {t("payment")}:{" "}
            {order.payment?.method === "COD" ? t("cod") : order.payment?.method}
          </p>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
