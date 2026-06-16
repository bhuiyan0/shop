import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { AdminLogin } from "@/components/auth/admin-login";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === Role.ADMIN) redirect("/admin");

  const t = await getTranslations("Auth");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center text-xl">{t("adminTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminLogin />
        </CardContent>
      </Card>
    </main>
  );
}
