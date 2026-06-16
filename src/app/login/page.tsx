import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { CustomerLogin } from "@/components/auth/customer-login";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  const { error } = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center text-xl">{t("loginTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerLogin oauthError={typeof error === "string" ? error : undefined} />
        </CardContent>
      </Card>
    </main>
  );
}
