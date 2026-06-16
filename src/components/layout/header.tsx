import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/dal";
import { getCart, cartCount, toCartLineViews } from "@/lib/cart";
import { Role } from "@/generated/prisma/enums";
import { LogoutButton } from "@/components/auth/logout-button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { SearchBox } from "@/components/search/search-box";
import { CategoryNav } from "@/components/category/category-nav";
import { MobileCategoryDrawer } from "@/components/category/mobile-category-drawer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Button } from "@/components/ui/button";

export async function Header() {
  const [user, cart, locale, tCommon, tNav] = await Promise.all([
    getCurrentUser(),
    getCart(),
    getLocale(),
    getTranslations("Common"),
    getTranslations("Nav"),
  ]);
  const count = cartCount(cart);
  const cartLines = toCartLineViews(cart, locale === "bn");

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-1">
          <MobileCategoryDrawer>
            <CategoryNav />
          </MobileCategoryDrawer>
          <Link href="/" className="shrink-0 text-lg font-bold">
            {tCommon("appName")}
          </Link>
        </div>

        <div className="hidden flex-1 justify-center px-2 sm:flex">
          <SearchBox />
        </div>

        <nav className="flex items-center gap-2">
          <LocaleSwitcher />
          <CartDrawer lines={cartLines} count={count} />
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
