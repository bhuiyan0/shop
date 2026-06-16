import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/dal";
import { getCart, cartCount } from "@/lib/cart";
import { Role } from "@/generated/prisma/enums";
import { LogoutButton } from "@/components/auth/logout-button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";

export async function Header() {
  const [user, cart, tCommon, tNav] = await Promise.all([
    getCurrentUser(),
    getCart(),
    getTranslations("Common"),
    getTranslations("Nav"),
  ]);
  const count = cartCount(cart);

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          {tCommon("appName")}
        </Link>

        <nav className="flex items-center gap-2">
          <LocaleSwitcher />
          <Button asChild variant="ghost" size="sm" className="relative">
            <Link href="/cart" aria-label={tCommon("cart")}>
              <ShoppingCart className="size-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
          {user ? (
            <>
              {user.role === Role.ADMIN && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">{tNav("admin")}</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href="/account">{tNav("account")}</Link>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">{tNav("login")}</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
