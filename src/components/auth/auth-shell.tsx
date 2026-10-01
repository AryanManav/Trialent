import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { AuthAside } from "@/components/auth/auth-aside";

export function AuthShell({
  title,
  subtitle,
  switchPrompt,
  switchLabel,
  switchHref,
  aside,
  children,
}: {
  title: string;
  subtitle: string;
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
  aside: { eyebrow: string; headline: string; body: string };
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas sm:p-fib4">
      <div className="mx-auto grid grid-cols-1 min-h-screen w-full max-w-[1760px] overflow-clip bg-surface shadow-sm sm:min-h-[calc(100vh-1rem)] sm:rounded-2xl lg:grid-cols-[1fr_minmax(0,46%)]">
        <div className="flex flex-col px-fib7 py-fib7 sm:px-fib8">
          <div className="flex items-center justify-between gap-fib5">
            <Link
              href="/"
              aria-label="Back to home"
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-600 transition-colors hover:bg-ink-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <p className="text-sm text-ink-500">
              {switchPrompt}{" "}
              <Link
                href={switchHref}
                className="font-semibold text-brand-700 underline underline-offset-4"
              >
                {switchLabel}
              </Link>
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-fib8">
            <h1 className="text-3xl font-semibold text-ink-950 sm:text-4xl">{title}</h1>
            <p className="mt-fib4 text-ink-400">{subtitle}</p>

            <div className="mt-fib8">{children}</div>
          </div>
        </div>

        <AuthAside {...aside} />
      </div>
    </div>
  );
}
