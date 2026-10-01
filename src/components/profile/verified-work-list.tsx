import Link from "next/link";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { SkillTags } from "@/components/search/result-rows";
import { CompanyMark } from "@/components/common/company-mark";
import { companyProfilePath } from "@/lib/constants";

/** One piece of platform-verified work, whatever view it came from. */
export interface VerifiedWorkItem {
  key: string;
  title: string;
  companyId?: string;
  companyName: string;
  /** When the startup accepted it. */
  date: string;
  /** "Full-stack apps · 8h" — the kind and size of the work. */
  detail?: string;
  stack?: string[];
  /** Extra facts shown only to the owner (outcome, requirements met). */
  facts?: string[];
  /** The startup's own words, shown only to the owner. */
  quote?: string | null;
}

const monthYear = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });

/**
 * Work a startup accepted on Trialent — the profile's strongest evidence, and
 * visibly different from anything self-reported: each entry carries who
 * verified it.
 */
export function VerifiedWorkList({
  items,
  emptyText,
}: {
  items: VerifiedWorkItem[];
  emptyText: string;
}) {
  return (
    <section
      aria-labelledby="verified-work"
      className="rounded-xl border border-line bg-surface"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2
          id="verified-work"
          className="flex items-center gap-2 text-base font-semibold text-ink-900"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden />
          Verified work
          <span className="tabular rounded bg-ink-100 px-1.5 text-2xs font-medium text-ink-500">
            {items.length}
          </span>
        </h2>
        <span className="hidden text-xs text-ink-500 sm:block">
          Accepted by the startup that commissioned it
        </span>
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-500">{emptyText}</p>
      ) : (
        <ol className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.key} className="flex gap-4 px-5 py-4">
              <CompanyMark name={item.companyName} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink-900">{item.title}</h3>
                    <p className="text-xs text-ink-500">
                      {item.companyId ? (
                        <Link
                          href={companyProfilePath(item.companyId)}
                          className="font-medium text-ink-700 hover:text-brand-700 hover:underline"
                        >
                          {item.companyName}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink-700">
                          {item.companyName}
                        </span>
                      )}
                      {item.detail && <> · {item.detail}</>}
                    </p>
                  </div>
                  <time dateTime={item.date} className="shrink-0 text-xs text-ink-500">
                    {monthYear.format(new Date(item.date))}
                  </time>
                </div>
                {item.stack && item.stack.length > 0 && (
                  <SkillTags skills={item.stack} limit={6} />
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    Work accepted · verified by {item.companyName}
                  </span>
                  {item.facts?.map((fact) => (
                    <span key={fact} className="text-ink-500">
                      {fact}
                    </span>
                  ))}
                </div>
                {item.quote && (
                  <blockquote className="border-l-2 border-line pl-3 text-sm text-ink-600">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
