import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/dal";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccountPage() {
  const user = await requireUser();
  const [t, tNav] = await Promise.all([
    getTranslations("Auth"),
    getTranslations("Nav"),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("accountTitle")}</h1>
        <LogoutButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {user.name ?? t("noName")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {user.email && <p>{user.email}</p>}
          {user.phone && <p>{user.phone}</p>}
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="mt-4">
        <Link href="/orders">{tNav("orders")}</Link>
      </Button>
    </main>
  );
}
