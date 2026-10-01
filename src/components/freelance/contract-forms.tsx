"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import {
  completeContractAction,
  confirmPaymentAction,
  logHoursAction,
  markMilestonePaidAction,
  reviewMilestoneAction,
  submitMilestoneAction,
} from "@/lib/actions/freelance";
import { FREELANCE_LIMITS } from "@/lib/constants";
import { weekStartOf } from "@/lib/freelance";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/common/status-banner";
import { inputClass, textareaClass } from "@/components/company/form-parts";
import { formatCurrency } from "@/lib/utils";
import type { ActionResponse } from "@/lib/types/actions";

function ActionError({ state }: { state: ActionResponse | null }) {
  return state?.error ? <StatusBanner tone="error">{state.error}</StatusBanner> : null;
}

const labelClass = "block text-sm font-medium text-ink-800";

/** Freelancer: hand in a milestone, with a link and what was delivered. */
export function SubmitMilestoneForm({
  projectId,
  milestoneId,
  resubmission,
}: {
  projectId: string;
  milestoneId: string;
  resubmission: boolean;
}) {
  const [state, action, pending] = useActionState(submitMilestoneAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <ActionError state={state} />
      <div className="space-y-1.5">
        <label htmlFor={`work-${milestoneId}`} className={labelClass}>
          Link to the work <span className="font-normal text-ink-400">optional</span>
        </label>
        <input
          id={`work-${milestoneId}`}
          name="workUrl"
          type="url"
          placeholder="https://github.com/… or a deployed URL"
          className={inputClass}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`note-${milestoneId}`} className={labelClass}>
          What you delivered
        </label>
        <textarea
          id={`note-${milestoneId}`}
          name="note"
          rows={3}
          required
          minLength={10}
          maxLength={4000}
          className={textareaClass}
        />
      </div>
      <Button type="submit" loading={pending}>
        {resubmission ? "Deliver the changes" : "Deliver milestone"}
      </Button>
    </form>
  );
}

/** Freelancer: log a week of hourly work for the company to approve. */
export function LogHoursForm({
  projectId,
  hourlyRate,
  currency,
}: {
  projectId: string;
  hourlyRate: number;
  currency: string;
}) {
  const [state, action, pending] = useActionState(logHoursAction, null);
  const [hours, setHours] = useState("");
  const today = new Date();
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <ActionError state={state} />
      {state?.success && (
        <StatusBanner tone="success">Hours logged for review.</StatusBanner>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="weekStart" className={labelClass}>
            Week starting
          </label>
          <input
            id="weekStart"
            name="weekStart"
            type="date"
            required
            defaultValue={weekStartOf(today)}
            max={today.toISOString().slice(0, 10)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="hours" className={labelClass}>
            Hours worked
          </label>
          <input
            id="hours"
            name="hours"
            type="number"
            step="0.5"
            min={0.5}
            max={FREELANCE_LIMITS.maxLoggedHours}
            required
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="hours-note" className={labelClass}>
          What you worked on
        </label>
        <textarea
          id="hours-note"
          name="note"
          rows={3}
          required
          minLength={10}
          maxLength={4000}
          className={textareaClass}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="hours-link" className={labelClass}>
          Link <span className="font-normal text-ink-400">optional</span>
        </label>
        <input
          id="hours-link"
          name="workUrl"
          type="url"
          placeholder="A pull request, commit range or document"
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {Number(hours) > 0
            ? `${formatCurrency(Math.round(Number(hours) * hourlyRate), currency)} at ${formatCurrency(hourlyRate, currency)}/hr`
            : `${formatCurrency(hourlyRate, currency)}/hr`}
        </p>
        <Button type="submit" loading={pending}>
          Log hours
        </Button>
      </div>
    </form>
  );
}

/** Company: approve delivered work, or send it back with what to change. */
export function ReviewMilestoneForm({
  projectId,
  milestoneId,
}: {
  projectId: string;
  milestoneId: string;
}) {
  const [state, action, pending] = useActionState(reviewMilestoneAction, null);
  const [asking, setAsking] = useState(false);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <ActionError state={state} />
      {asking && (
        <div className="space-y-1.5">
          <label htmlFor={`review-${milestoneId}`} className={labelClass}>
            What needs to change
          </label>
          <textarea
            id={`review-${milestoneId}`}
            name="note"
            rows={3}
            required
            minLength={10}
            maxLength={2000}
            className={textareaClass}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {asking ? (
          <>
            <Button
              type="submit"
              name="decision"
              value="changes_requested"
              variant="outline"
              loading={pending}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Send back for changes
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              type="submit"
              name="decision"
              value="approved"
              variant="success"
              loading={pending}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Approve
            </Button>
            <Button type="button" variant="outline" onClick={() => setAsking(true)}>
              Ask for changes
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

/** One-click contract actions: mark paid, confirm payment received. */
function MilestoneButton({
  projectId,
  milestoneId,
  run,
  label,
  confirm,
}: {
  projectId: string;
  milestoneId: string;
  run: typeof markMilestonePaidAction;
  label: string;
  confirm: string;
}) {
  const [state, action, pending] = useActionState(run, null);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <ActionError state={state} />
      <Button type="submit" size="sm" loading={pending}>
        {label}
      </Button>
    </form>
  );
}

export function MarkPaidButton(props: {
  projectId: string;
  milestoneId: string;
  amount: string;
}) {
  return (
    <MilestoneButton
      projectId={props.projectId}
      milestoneId={props.milestoneId}
      run={markMilestonePaidAction}
      label={`Mark ${props.amount} as paid`}
      confirm={`Confirm you've paid ${props.amount} to the freelancer directly. They'll be asked to confirm they received it.`}
    />
  );
}

export function ConfirmPaymentButton(props: {
  projectId: string;
  milestoneId: string;
  amount: string;
}) {
  return (
    <MilestoneButton
      projectId={props.projectId}
      milestoneId={props.milestoneId}
      run={confirmPaymentAction}
      label="I received this payment"
      confirm={`Confirm ${props.amount} arrived in your account?`}
    />
  );
}

/** Company: end the contract. Undelivered milestones are cancelled. */
export function CompleteContractForm({
  projectId,
  hasApprovedWork,
}: {
  projectId: string;
  hasApprovedWork: boolean;
}) {
  const [state, action, pending] = useActionState(completeContractAction, null);
  const message = hasApprovedWork
    ? "End the contract? Milestones not yet delivered are cancelled, and the approved work goes on the freelancer's verified history."
    : "End the contract without any approved work? Milestones not yet delivered are cancelled.";
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <ActionError state={state} />
      <Button
        type="submit"
        variant={hasApprovedWork ? "default" : "destructive"}
        loading={pending}
      >
        {hasApprovedWork ? "Complete contract" : "End contract"}
      </Button>
    </form>
  );
}
