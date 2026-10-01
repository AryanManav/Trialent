import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Every marketing section opens the same way: an overline, a heading whose
 * second half drops to grey, then an optional subhead. Hierarchy comes from
 * tonal value rather than extra weight.
 */
export function SectionHeading({
  chip,
  title,
  trailing,
  subtitle,
  align = "center",
  className,
}: {
  /** The overline above the heading. */
  chip?: string;
  title: ReactNode;
  /** Rendered in muted grey on its own line, continuing the sentence. */
  trailing?: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "space-y-3",
        centered && "flex flex-col items-center text-center",
        className
      )}
    >
      {chip && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-900 dark:text-lime">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-lime ring-1 ring-lime-fg/20"
          />
          {chip}
        </p>
      )}

      <h2 className="max-w-3xl text-balance text-3xl font-semibold text-ink-900 sm:text-4xl">
        {title}
        {trailing && (
          <>
            {" "}
            <span className="text-ink-400">{trailing}</span>
          </>
        )}
      </h2>

      {subtitle && (
        <p className={cn("max-w-2xl text-base text-ink-500", centered && "mx-auto")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
