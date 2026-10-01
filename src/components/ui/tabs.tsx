import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  href: string;
  count?: number;
}

/**
 * Underlined tabs that are links, so each tab has a URL, works without
 * JavaScript and survives a refresh.
 */
export function LinkTabs({
  tabs,
  active,
  label,
  className,
}: {
  tabs: TabItem[];
  active: string;
  /** Accessible name for the tab strip. */
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "no-scrollbar -mx-1 overflow-x-auto border-b border-line px-1",
        className
      )}
    >
      <ul className="flex gap-5">
        {tabs.map((tab) => {
          const current = tab.id === active;
          return (
            <li key={tab.id}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm transition-colors",
                  current
                    ? "border-lime font-medium text-ink-900"
                    : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800"
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "tabular rounded px-1.5 text-2xs font-medium",
                      current ? "bg-lime-soft text-ink-900" : "bg-ink-100 text-ink-500"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
