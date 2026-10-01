import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The building blocks of the smaller marketing pages (/how-it-works,
 * /for-candidates, /for-companies), in the landing page's language: a lime
 * overline, a sentence-case headline, then cards or numbered steps.
 */
export function MarketingHero({
  chip,
  title,
  lead,
  children,
}: {
  chip: string;
  title: ReactNode;
  lead: ReactNode;
  /** Calls to action under the lead. */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col items-center space-y-4 text-center">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-900 dark:text-lime">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-lime ring-1 ring-lime-fg/20"
        />
        {chip}
      </p>
      <h1 className="max-w-3xl text-balance text-4xl font-semibold text-ink-950 sm:text-5xl">
        {title}
      </h1>
      <p className="max-w-2xl text-lg text-ink-600">{lead}</p>
      {children && (
        <div className="flex flex-wrap justify-center gap-3 pt-2">{children}</div>
      )}
    </header>
  );
}

export interface Feature {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
}

export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <ul
      className={cn(
        "grid gap-4",
        features.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
      )}
    >
      {features.map(({ icon: Icon, title, body }) => (
        <li key={title} className="rounded-xl border border-line bg-surface p-6">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-lime-soft text-ink-900 dark:text-lime">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{body}</p>
        </li>
      ))}
    </ul>
  );
}

export interface Step {
  title: string;
  body: ReactNode;
}

/** A numbered sequence, joined by a hairline so it reads as one flow. */
export function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative mx-auto max-w-3xl space-y-4 before:absolute before:bottom-6 before:left-[1.4rem] before:top-6 before:w-px before:bg-line">
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-5">
          <span className="tabular relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface font-mono text-sm font-semibold text-ink-900 shadow-sm">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 rounded-xl border border-line bg-surface p-5">
            <h2 className="text-base font-semibold text-ink-900">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
