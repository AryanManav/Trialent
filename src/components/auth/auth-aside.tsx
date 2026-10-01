import { KeyRound, ShieldCheck, TrendingUp } from "lucide-react";

/**
 * The branded half of the auth split. Layered organic shapes behind two
 * floating cards, mirroring the hero's fragment treatment so signing up feels
 * continuous with the landing page.
 *
 * Hidden below lg, where the form takes the full width.
 */
export function AuthAside({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <aside className="relative hidden overflow-hidden bg-night lg:block">
      {/* Layered shapes */}
      <div className="absolute -left-24 -top-32 h-[28rem] w-[28rem] rounded-[6rem] bg-white/[0.04] rotate-12" />
      <div className="absolute -bottom-40 -right-24 h-[34rem] w-[34rem] rounded-[8rem] bg-lime/15 -rotate-12" />
      <div className="absolute bottom-[-6rem] left-[-4rem] h-[22rem] w-[22rem] rounded-full bg-lime/10" />

      <div className="relative flex h-full flex-col justify-center gap-fib7 px-fib8 py-fib9">
        {/* Evidence card */}
        <div className="w-[19rem] rounded-2xl bg-surface p-fib6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">
            Verified record
          </p>
          <p className="mt-fib4 text-3xl font-semibold text-ink-900">4 / 4</p>
          <p className="text-xs text-ink-400">requirements completed</p>

          <div className="mt-fib6 flex items-end gap-fib3">
            {[40, 68, 52, 88, 74].map((height, index) => (
              <span
                key={height}
                className="flex-1 rounded-full bg-lime-soft"
                style={{ height: `${height / 2}px` }}
              >
                <span
                  className="block w-full rounded-full bg-lime"
                  style={{ height: `${height / 2}px`, opacity: 0.4 + index * 0.15 }}
                />
              </span>
            ))}
          </div>

          <div className="mt-fib5 flex items-center gap-fib4 border-t border-line pt-fib5">
            <TrendingUp className="h-4 w-4 text-emerald-700" />
            <p className="text-xs font-medium text-ink-600">Delivered before deadline</p>
          </div>
        </div>

        {/* Message card */}
        <div className="w-[24rem] rounded-2xl bg-surface p-fib7 shadow-xl">
          <div className="flex items-start justify-between gap-fib6">
            <div className="flex-1 space-y-fib4" aria-hidden="true">
              <span className="block h-2 w-16 rounded-full bg-lime" />
              <span className="block h-2 w-full rounded-full bg-ink-200" />
              <span className="block h-2 w-3/4 rounded-full bg-ink-200" />
              <span className="block h-2 w-5/6 rounded-full bg-ink-200" />
            </div>
            <KeyRound className="h-10 w-10 shrink-0 text-accent-500" />
          </div>

          <p className="mt-fib6 text-lg font-semibold text-ink-900">{headline}</p>
          <p className="mt-fib3 text-sm leading-relaxed text-ink-500">{body}</p>
        </div>

        <p className="flex items-center gap-fib4 text-sm font-medium text-white/90">
          <ShieldCheck className="h-5 w-5" />
          {eyebrow}
        </p>
      </div>
    </aside>
  );
}
