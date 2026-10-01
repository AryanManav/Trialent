import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/guards";
import { homeFor, navigationFor, primaryNavFor } from "@/lib/constants";
import { PrimaryNavLinks } from "@/components/layout/primary-nav-links";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/layout/logo";
import { GlobalSearch } from "@/components/search/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getNotificationSummary } from "@/lib/data/notifications";
import type { NotificationSummary } from "@/lib/types/domain";

const NO_NOTIFICATIONS: NotificationSummary = { unreadCount: 0, recent: [], unread: [] };

/**
 * The one navigation, on every page. Signed in, it carries the role's whole
 * product — sections, search, notifications, the account menu — so nothing
 * is ever reached only through a dashboard. 56px tall.
 */
export async function PublicNavbar() {
  const user = await getCurrentUser();
  const navigation = navigationFor(user?.role);
  const links = primaryNavFor(user?.role);
  // Admins aren't party to any application, so nothing is ever addressed to them.
  const notifications =
    user && user.role !== "admin" ? await getNotificationSummary(user.id) : null;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
          <Link
            href={homeFor(user?.role)}
            aria-label="Trialent home"
            className="shrink-0 rounded-md"
          >
            <Logo />
          </Link>

          {user && (
            <div className="hidden min-w-0 max-w-sm flex-1 md:block">
              <GlobalSearch role={user.role} />
            </div>
          )}

          <div className="flex h-full flex-1 items-center justify-end gap-1">
            <PrimaryNavLinks
              links={links}
              variant="desktop"
              notifications={notifications ?? NO_NOTIFICATIONS}
            />

            {user ? (
              <div className="ml-2 flex items-center gap-1 border-l border-line pl-3">
                {navigation?.action && (
                  <Link href={navigation.action.href} className="mr-1 hidden sm:block">
                    <Button size="sm">
                      <Plus className="h-4 w-4" aria-hidden />
                      {navigation.action.label}
                    </Button>
                  </Link>
                )}
                {notifications && <NotificationBell initial={notifications} />}
                <UserMenu user={user} />
              </div>
            ) : (
              <div className="ml-2 flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Get started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tablet: the sections move under the header. Phone: the bottom bar. */}
      {user ? (
        <>
          <div className="hidden md:block lg:hidden">
            <PrimaryNavLinks links={links} variant="mobile" />
          </div>
          {navigation && (
            <BottomNav
              items={navigation.bottom}
              notifications={notifications ?? NO_NOTIFICATIONS}
            />
          )}
        </>
      ) : (
        <PrimaryNavLinks links={links} variant="mobile" />
      )}
    </>
  );
}
