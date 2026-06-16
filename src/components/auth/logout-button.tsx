import { getTranslations } from "next-intl/server";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export async function LogoutButton({
  variant = "outline",
}: {
  variant?: "outline" | "ghost" | "default";
}) {
  const t = await getTranslations("Auth");
  return (
    <form action={logout}>
      <Button type="submit" variant={variant} size="sm">
        {t("logout")}
      </Button>
    </form>
  );
}
