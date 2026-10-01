import { cn } from "@/lib/utils";

/** Brand colours. The lime is the mark's alone; the UI stays monochrome. */
export const BRAND_LIME = "#c6f432";
export const BRAND_INK = "#0d1117";

/**
 * The Trialent logo: the mark followed by the name, set in the app's own type
 * (Inter) so it themes with the page.
 *
 * `markOnly` shows just the mark, for tight spaces and avatars.
 */
export function Logo({
  markOnly = false,
  inverted = false,
  className,
}: {
  markOnly?: boolean;
  /** On a dark band regardless of theme (e.g. a coloured panel). */
  inverted?: boolean;
  className?: string;
}) {
  if (markOnly) return <LogoMark className={cn("h-7 w-7", className)} />;

  return (
    <span className={cn("inline-flex select-none items-center gap-2", className)}>
      <LogoMark className="h-7 w-7" />
      <span
        className={cn(
          "text-[21px] font-bold leading-none tracking-[-0.045em]",
          inverted ? "text-white" : "text-ink-900"
        )}
      >
        trialent
      </span>
    </span>
  );
}

/**
 * The mark — "the ticking t": the t of trial drawn in one stroke whose foot
 * turns up into a tick, a trial that ends in proof. Ink on lime in every
 * theme; the favicon (src/app/icon.svg) and home-screen icon
 * (src/app/apple-icon.tsx) repeat this geometry.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className={cn("shrink-0", className)}
      fill="none"
    >
      <rect width="48" height="48" rx="13" fill={BRAND_LIME} />
      <path
        d="M20 8.5V29.8C20 35 22.6 37.6 26.6 37.6C28.8 37.6 30.3 36.6 31.6 34.9L38.5 25.6"
        stroke={BRAND_INK}
        strokeWidth="6.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 16.5H28"
        stroke={BRAND_INK}
        strokeWidth="6.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
