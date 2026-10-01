import {
  Check,
  CircleDot,
  FileCheck2,
  GitCommitHorizontal,
  ListChecks,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The hero visual: one project moving through Trialent, drawn with the
 * product's own components — brief, build, submission, evaluation, signal.
 * Sample content only; nothing here claims a real customer.
 */

const STEPS = [
  { icon: ListChecks, label: "Brief", state: "done" },
  { icon: GitCommitHorizontal, label: "Build", state: "done" },
  { icon: FileCheck2, label: "Submit", state: "done" },
  { icon: CircleDot, label: "Evaluate", state: "done" },
  { icon: UserCheck, label: "Decide", state: "current" },
] as const;

const REQUIREMENTS = [
  { label: "Auth and board creation", done: true },
  { label: "Drag-and-drop columns", done: true },
  { label: "Real-time sync across tabs", done: true },
  { label: "Tests for the board reducer", done: true },
];

const COMMITS = [
  { message: "Add optimistic card moves", time: "2d" },
  { message: "Sync board state over websockets", time: "3d" },
  { message: "Board, column and card models", time: "5d" },
];

const EVALUATION = [
  { label: "Requirements met", value: "4 of 4", good: true },
  { label: "Code quality", value: "Exceeds", good: true },
  { label: "Testing", value: "Meets", good: true },
  { label: "Delivered on time", value: "Yes", good: true },
];

export function HeroWorkflow() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem]" aria-hidden>
      {/* Project window */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="text-2xs font-medium uppercase tracking-wider text-ink-400">
              Paid project · Sample
            </p>
            <p className="truncate text-sm font-semibold text-ink-900">
              Real-time collaborative Kanban board
            </p>
          </div>
          <span className="tabular shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
            ₹5,000
          </span>
        </div>

        {/* Step rail */}
        <ol className="flex items-center gap-1 border-b border-line bg-ink-50 px-4 py-2.5">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.label} className="flex flex-1 items-center gap-1">
                <span
                  className={cn(
                    "flex items-center gap-1 text-2xs font-medium",
                    step.state === "done" && "text-ink-600",
                    step.state === "current" && "text-brand-700"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    className={cn(
                      "h-px flex-1",
                      step.state === "done" ? "bg-ink-300" : "bg-ink-200"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>

        <div className="grid gap-4 p-4 pb-10 sm:grid-cols-2">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
              Requirements
            </p>
            <ul className="mt-2 space-y-1.5">
              {REQUIREMENTS.map((item) => (
                <li
                  key={item.label}
                  className="flex items-start gap-2 text-xs text-ink-700"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
              Work trail
            </p>
            <ul className="mt-2 space-y-1.5">
              {COMMITS.map((commit) => (
                <li key={commit.message} className="flex items-center gap-2 text-xs">
                  <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <span className="truncate font-mono text-[11px] text-ink-700">
                    {commit.message}
                  </span>
                  <span className="ml-auto shrink-0 text-ink-400">{commit.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Evaluation, overlapping the window */}
      <div className="relative -mt-6 ml-auto w-[88%] rounded-xl border border-line bg-surface p-4 shadow-lg sm:mr-[-1.5rem]">
        <div className="flex items-center justify-between">
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
            Evaluation
          </p>
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-px text-2xs font-medium text-emerald-800">
            <Check className="h-3 w-3" />
            Accepted
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {EVALUATION.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <dt className="text-ink-500">{row.label}</dt>
              <dd className="font-medium text-ink-900">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
          <span className="text-xs text-ink-600">Hiring signal</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700">
            <UserCheck className="h-3.5 w-3.5" />
            Would interview
          </span>
        </div>
      </div>
    </div>
  );
}
