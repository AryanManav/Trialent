"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Trash2, XCircle } from "lucide-react";
import {
  deleteProjectAction,
  setProjectVisibilityAction,
  withdrawProjectAction,
} from "@/lib/actions/company";
import { SubmitButton } from "@/components/ui/submit-button";
import { COMPANY_MANAGEABLE_PROJECT_STATUSES } from "@/lib/constants";
import type { OpportunityType, ProjectStatus } from "@/lib/types/database.types";

/**
 * Visibility, withdraw and delete for one project. Each is only offered while
 * the database would allow it: before a candidate is selected, and for delete,
 * before anyone has applied.
 */
export function ProjectControls({
  projectId,
  status,
  applicationCount,
  applicationDeadline,
  kind = "build",
}: {
  projectId: string;
  status: ProjectStatus;
  /** Past this, Browse no longer lists it and nobody can apply, whatever the status. */
  applicationDeadline: string;
  /** Every application ever made, withdrawn included — they're on record. */
  applicationCount: number;
  /** A hire-only role is closed, not withdrawn, and has no work to protect. */
  kind?: OpportunityType;
}) {
  const [open, setOpen] = useState<"withdraw" | "delete" | null>(null);
  const hire = kind === "hire";
  const noun = hire ? "role" : "project";

  const manageable = (
    COMPANY_MANAGEABLE_PROJECT_STATUSES as readonly ProjectStatus[]
  ).includes(status);
  if (status === "cancelled") {
    return (
      <p className="flex items-center gap-fib2 rounded-xl border border-line bg-surface-muted px-fib5 py-fib4 text-sm text-ink-600">
        <XCircle className="h-4 w-4" />
        {hire
          ? "Hiring for this role was closed. Candidates still in the running were notified."
          : "This project was withdrawn. Applicants were notified."}
      </p>
    );
  }
  // A filled role is finished — the hiring status says so; nothing to control.
  if (hire && !manageable) return null;
  if (!manageable) {
    return (
      <p className="flex items-center gap-fib2 text-xs text-ink-400">
        <Lock className="h-3.5 w-3.5" />A candidate has been selected, so this project can
        no longer be hidden, withdrawn or deleted.
      </p>
    );
  }

  const isPrivate = status === "draft";
  const deadlinePassed = new Date(applicationDeadline).getTime() <= Date.now();
  const canDelete = applicationCount === 0;

  return (
    <div className="space-y-fib4 rounded-2xl border border-line bg-surface p-fib5">
      <div className="flex flex-wrap items-center justify-between gap-fib4">
        <p className="flex items-center gap-fib3 text-sm">
          {isPrivate ? (
            <>
              <EyeOff className="h-4 w-4 text-ink-500" />
              <span>
                <span className="font-semibold text-ink-900">Private.</span>{" "}
                <span className="text-ink-500">
                  Hidden from Browse; applications are paused.
                </span>
              </span>
            </>
          ) : deadlinePassed ? (
            <>
              <Lock className="h-4 w-4 text-ink-500" />
              <span>
                <span className="font-semibold text-ink-900">Applications closed.</span>{" "}
                <span className="text-ink-500">
                  The deadline has passed, so it&apos;s no longer listed in Browse.
                </span>
              </span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 text-emerald-700" />
              <span>
                <span className="font-semibold text-ink-900">Public.</span>{" "}
                <span className="text-ink-500">
                  Listed in Browse and taking applications.
                </span>
              </span>
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-fib3">
          <form action={setProjectVisibilityAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input
              type="hidden"
              name="visibility"
              value={isPrivate ? "public" : "private"}
            />
            <SubmitButton size="sm" variant="outline" className="gap-fib2">
              {isPrivate ? (
                <>
                  <Eye className="h-4 w-4" />
                  Make public
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Make private
                </>
              )}
            </SubmitButton>
          </form>
          <button
            type="button"
            onClick={() => setOpen(open === "withdraw" ? null : "withdraw")}
            className="rounded-md border border-rose-200 px-fib5 py-fib2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            {hire ? "Close hiring" : "Withdraw"}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => setOpen(open === "delete" ? null : "delete")}
              className="inline-flex items-center gap-fib2 rounded-md border border-rose-200 px-fib5 py-fib2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {open === "withdraw" && (
        <form
          action={withdrawProjectAction}
          className="space-y-fib3 rounded-xl border border-rose-200 bg-rose-50 p-fib5"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <p className="text-sm font-semibold text-rose-900">
            {hire ? "Close hiring for this role?" : "Withdraw this project for good?"}
          </p>
          <p className="text-sm text-rose-900/80">
            It leaves Browse and stops taking applications
            {hire ? ", and moves to your history as closed" : ""}.{" "}
            {applicationCount === 0
              ? "Nobody has applied yet."
              : hire
                ? "Candidates still in the running will be notified. Anyone you've already hired stays hired."
                : `All ${applicationCount} applicant${applicationCount === 1 ? "" : "s"} will be notified and their applications closed.`}{" "}
            This can&apos;t be undone.
          </p>
          <label className="block space-y-fib2">
            <span className="text-xs font-semibold text-rose-900">
              Reason, sent to applicants (optional)
            </span>
            <textarea
              name="reason"
              rows={3}
              maxLength={1000}
              placeholder={
                hire
                  ? "e.g. We've filled the role — thank you for applying."
                  : "e.g. Our plans changed — thank you for applying."
              }
              className="w-full rounded-lg border border-rose-200 bg-surface p-fib4 text-sm"
            />
          </label>
          <div className="flex gap-fib3">
            <SubmitButton size="sm" className="bg-rose-600 hover:bg-rose-700">
              {hire ? "Close hiring" : "Withdraw project"}
            </SubmitButton>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="text-sm font-semibold text-ink-500 hover:text-ink-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {open === "delete" && (
        <form
          action={deleteProjectAction}
          className="flex flex-wrap items-center gap-fib4 rounded-xl border border-rose-200 bg-rose-50 p-fib5"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <p className="text-sm text-rose-900">
            Delete this {noun} permanently? Nobody has applied, so nothing else is
            affected.
          </p>
          <SubmitButton size="sm" className="bg-rose-600 hover:bg-rose-700">
            Delete permanently
          </SubmitButton>
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="text-sm font-semibold text-ink-500 hover:text-ink-800"
          >
            Cancel
          </button>
        </form>
      )}

      {!canDelete && (
        <p className="text-xs text-ink-400">
          Candidates have applied, so this {noun} can be {hire ? "closed" : "withdrawn"}{" "}
          but not deleted.
        </p>
      )}
    </div>
  );
}
