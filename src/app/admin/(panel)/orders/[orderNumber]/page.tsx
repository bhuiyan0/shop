import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatBDT } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import { OrderStatus } from "@/generated/prisma/enums";
import { OrderStatusUpdater } from "@/components/admin/order-status-updater";
import { Separator } from "@/components/ui/separator";

export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const locale = (await getLocale()) as Locale;
  const isBn = locale === "bn";
  const t = await getTranslations("Admin");
  const to = await getTranslations("Orders");

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, payment: true },
  });
  if (!order) notFound();

  const statusOptions = Object.values(OrderStatus).map((value) => ({
    value,
    label: to(`status.${value}`),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-xl font-semibold">{order.orderNumber}</h1>
        <p className="text-sm text-muted-foreground">
          {order.customerName} · {order.customerPhone}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="rounded-lg border p-4">
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
          <Separator className="my-4" />
          <dl className="space-y-1 text-sm">
            <Row label={to("subtotal")} value={formatBDT(order.subtotal, { locale })} />
            <Row label={to("shipping")} value={formatBDT(order.shippingFee, { locale })} />
            {order.discount > 0 && (
              <Row label={to("discount")} value={`− ${formatBDT(order.discount, { locale })}`} />
            )}
            <div className="flex justify-between pt-2 text-base font-semibold">
              <dt>{to("total")}</dt>
              <dd>{formatBDT(order.total, { locale })}</dd>
            </div>
          </dl>
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border p-4">
            <OrderStatusUpdater
              orderId={order.id}
              current={order.status}
              options={statusOptions}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {to("payment")}:{" "}
              {order.payment?.method === "COD" ? to("cod") : order.payment?.method}{" "}
              ({order.payment?.status})
            </p>
          </div>

          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{to("deliverTo")}</p>
            <p>{order.addressLine}</p>
            <p>
              {order.area}, {order.city}, {order.district}
            </p>
          </div>
        </aside>
      </div>
    </div>
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
