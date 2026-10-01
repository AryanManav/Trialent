"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { countUnreadUnder } from "@/lib/notifications";
import { isNavActive, type NavLink } from "@/lib/constants";
import { useNotificationSummary } from "@/components/notifications/notification-store";
import type { NotificationSummary } from "@/lib/types/domain";

const NO_NOTIFICATIONS: NotificationSummary = { unreadCount: 0, recent: [], unread: [] };

/** Unread notifications that point inside a nav item. */
export function unreadIn(link: NavLink, summary: NotificationSummary): number {
  const prefixes = link.match ?? [link.href.split("?")[0]];
  return prefixes.reduce(
    (total, prefix) => total + countUnreadUnder(summary.unread, prefix),
    0
  );
}

/**
 * The role's top-level links. Desktop: inline in the navbar, the current
 * section underlined. Mobile (visitors only — signed-in users get the bottom
 * bar): a swipeable strip under the header.
 */
export function PrimaryNavLinks({
  links,
  variant,
  notifications = NO_NOTIFICATIONS,
}: {
  links: NavLink[];
  variant: "desktop" | "mobile";
  notifications?: NotificationSummary;
}) {
  const pathname = usePathname();
  const summary = useNotificationSummary(notifications);

  if (variant === "mobile") {
    return (
      <nav
        aria-label="Main"
        className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-1.5 lg:hidden"
      >
        {links.map((link) => {
          const current = isNavActive(link, pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors",
                current
                  ? "bg-ink-100 font-medium text-ink-900"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className="hidden h-full items-stretch gap-1 lg:flex">
      {links.map((link) => {
        const current = isNavActive(link, pathname);
        const unread = unreadIn(link, summary);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-1.5 border-b-2 px-2.5 text-sm transition-colors",
              current
                ? "border-lime font-medium text-ink-900"
                : "border-transparent text-ink-600 hover:text-ink-900"
            )}
          >
            {link.label}
            {unread > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500">
                <span className="sr-only">, {unread} new</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
