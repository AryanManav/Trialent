"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { isNavActive, type NavLink } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * A link is current when the path matches and, if the link carries a query
 * (Hiring is /company/projects?type=hire), every one of its parameters does.
 */
export function isSidebarLinkActive(
  link: NavLink,
  pathname: string,
  params: URLSearchParams
): boolean {
  if (!isNavActive(link, pathname)) return false;
  const [path, query] = link.href.split("?");
  if (!query) return true;
  if (pathname === path) {
    return [...new URLSearchParams(query)].every(
      ([key, value]) => params.get(key) === value
    );
  }
  // Elsewhere, only an explicit `match` prefix (not the href's own path) counts.
  return (link.match ?? []).some(
    (prefix) => prefix !== path && pathname.startsWith(`${prefix}/`)
  );
}

/**
 * The role's workspace sections, down the left on desktop. Quiet by design: a
 * thin accent bar and a subtle fill mark where you are — no coloured pills.
 * Phones use the bottom bar instead.
 */
export function WorkspaceSidebar({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  // A query-less link that shares a path with a query link (All vs Hiring)
  // yields to the more specific one.
  const specific = links.find(
    (link) => link.href.includes("?") && isSidebarLinkActive(link, pathname, params)
  );

  return (
    <nav aria-label="Workspace" className="space-y-0.5">
      {links.map((link) => {
        const current = specific
          ? link === specific
          : isSidebarLinkActive(link, pathname, params);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative flex items-center rounded-md px-3 py-1.5 text-sm transition-colors",
              current
                ? "bg-ink-100 font-medium text-ink-900 before:absolute before:inset-y-1.5 before:-left-2 before:w-1 before:rounded-full before:bg-lime"
                : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
