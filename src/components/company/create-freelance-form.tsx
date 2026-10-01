"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createFreelanceAction } from "@/lib/actions/freelance";
import {
  FREELANCE_LIMITS,
  MAX_APPLICANTS_LIMIT,
  PRICING_MODELS,
  PROJECT_CATEGORIES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/common/status-banner";
import {
  Field,
  FormSection,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/company/form-parts";
import { cn, formatCurrency } from "@/lib/utils";
import type { PricingModel } from "@/lib/types/database.types";

interface MilestoneRow {
  key: number;
  amount: string;
}

/**
 * A freelance contract: one freelancer, paid by the company directly, either
 * a fixed price split into milestones or an hourly rate with weekly logs.
 *
 * Submitted through startTransition rather than the form's action prop, so a
 * validation error from the server leaves everything typed in place.
 */
export function CreateFreelanceForm() {
  const [state, formAction, pending] = useActionState(createFreelanceAction, null);
  const [pricing, setPricing] = useState<PricingModel>("fixed");
  const [rows, setRows] = useState<MilestoneRow[]>([{ key: 1, amount: "" }]);
  const [rate, setRate] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [weeks, setWeeks] = useState("");
  const nextKey = useRef(2);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.error)
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  const fixedTotal = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const hourlyEstimate =
    (Number(rate) || 0) * (Number(hoursPerWeek) || 0) * (Number(weeks) || 0);

  const addRow = () => {
    if (rows.length >= FREELANCE_LIMITS.maxMilestones) return;
    setRows((current) => [...current, { key: nextKey.current++, amount: "" }]);
  };
  const removeRow = (key: number) =>
    setRows((current) =>
      current.length > 1 ? current.filter((row) => row.key !== key) : current
    );
  const setAmount = (key: number, amount: string) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, amount } : row))
    );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="space-y-6 rounded-xl border border-line bg-surface p-6"
    >
      {state?.error && (
        <div ref={errorRef}>
          <StatusBanner tone="error">{state.error}</StatusBanner>
        </div>
      )}

      <FormSection title="The work" description="What freelancers see on the listing.">
        <Field id="title" label="Contract title">
          <input
            id="title"
            name="title"
            required
            minLength={5}
            maxLength={150}
            placeholder="e.g. Build the admin panel for our booking app"
            className={inputClass}
          />
        </Field>
        <Field id="category" label="Topic">
          <select
            id="category"
            name="category"
            required
            defaultValue=""
            className={selectClass}
          >
            <option value="" disabled>
              Choose a topic
            </option>
            {Object.entries(PROJECT_CATEGORIES).map(([value, topic]) => (
              <option key={value} value={value}>
                {topic.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="description"
          label="Summary"
          hint="One or two sentences for the listing."
        >
          <textarea
            id="description"
            name="description"
            rows={2}
            required
            minLength={20}
            className={textareaClass}
          />
        </Field>
        <Field id="skills" label="Skills" optional hint="One per line.">
          <textarea id="skills" name="skills" rows={3} className={textareaClass} />
        </Field>
        <Field id="problemStatement" label="What needs doing">
          <textarea
            id="problemStatement"
            name="problemStatement"
            rows={5}
            required
            minLength={30}
            className={textareaClass}
          />
        </Field>
        <Field
          id="context"
          label="Context"
          hint="Your product, the codebase or tools they'll use, and who they'll work with."
        >
          <textarea
            id="context"
            name="context"
            rows={4}
            required
            minLength={30}
            className={textareaClass}
          />
        </Field>
        <Field id="requirements" label="Requirements" hint="One per line.">
          <textarea
            id="requirements"
            name="requirements"
            rows={3}
            required
            className={textareaClass}
          />
        </Field>
        <Field id="deliverables" label="Deliverables" hint="One per line.">
          <textarea
            id="deliverables"
            name="deliverables"
            rows={3}
            required
            className={textareaClass}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Pricing"
        description="You pay the freelancer directly. Trialent records what was agreed, approved and paid."
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-800">
            How will you pay?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(PRICING_MODELS) as PricingModel[]).map((model) => (
              <label
                key={model}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
                  pricing === model
                    ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/15"
                    : "border-line hover:border-ink-300"
                )}
              >
                <input
                  type="radio"
                  name="pricingModel"
                  value={model}
                  checked={pricing === model}
                  onChange={() => setPricing(model)}
                  className="mt-1 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">
                    {PRICING_MODELS[model].label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {PRICING_MODELS[model].hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {pricing === "fixed" ? (
          <>
            <Field
              id="expectedHours"
              label="Estimated total effort (hours)"
              hint="Helps freelancers judge the price."
            >
              <input
                id="expectedHours"
                name="expectedHours"
                type="number"
                min={1}
                max={1000}
                required
                className={inputClass}
              />
            </Field>

            <div className="space-y-3">
              <p className="text-sm font-medium text-ink-800">Milestones</p>
              <ol className="space-y-3">
                {rows.map((row, index) => (
                  <li
                    key={row.key}
                    className="space-y-3 rounded-lg border border-line p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                        Milestone {index + 1}
                      </span>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Remove
                        </button>
                      )}
                    </div>
                    <Field id={`milestoneTitle-${row.key}`} label="Title">
                      <input
                        id={`milestoneTitle-${row.key}`}
                        name="milestoneTitle"
                        required
                        maxLength={150}
                        placeholder="e.g. Login and dashboard screens"
                        className={inputClass}
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        id={`milestoneAmount-${row.key}`}
                        label="Amount (INR)"
                        hint={`At least ₹${FREELANCE_LIMITS.minMilestoneAmount}.`}
                      >
                        <input
                          id={`milestoneAmount-${row.key}`}
                          name="milestoneAmount"
                          type="number"
                          min={FREELANCE_LIMITS.minMilestoneAmount}
                          required
                          value={row.amount}
                          onChange={(event) => setAmount(row.key, event.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <Field id={`milestoneDue-${row.key}`} label="Due">
                        <input
                          id={`milestoneDue-${row.key}`}
                          name="milestoneDue"
                          type="datetime-local"
                          required
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <Field
                      id={`milestoneDescription-${row.key}`}
                      label="What's included"
                      optional
                    >
                      <textarea
                        id={`milestoneDescription-${row.key}`}
                        name="milestoneDescription"
                        rows={2}
                        maxLength={2000}
                        className={textareaClass}
                      />
                    </Field>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  disabled={rows.length >= FREELANCE_LIMITS.maxMilestones}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add milestone
                </Button>
                <p className="text-sm text-ink-600">
                  Contract total{" "}
                  <span className="tabular font-semibold text-emerald-700">
                    {formatCurrency(fixedTotal)}
                  </span>
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                id="hourlyRate"
                label="Hourly rate (INR)"
                hint={`At least ₹${FREELANCE_LIMITS.minHourlyRate}.`}
              >
                <input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  min={FREELANCE_LIMITS.minHourlyRate}
                  max={FREELANCE_LIMITS.maxHourlyRate}
                  required
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="hoursPerWeek" label="Hours a week">
                <input
                  id="hoursPerWeek"
                  name="hoursPerWeek"
                  type="number"
                  min={1}
                  max={FREELANCE_LIMITS.maxHoursPerWeek}
                  required
                  value={hoursPerWeek}
                  onChange={(event) => setHoursPerWeek(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="durationWeeks" label="Length (weeks)">
                <input
                  id="durationWeeks"
                  name="durationWeeks"
                  type="number"
                  min={1}
                  max={FREELANCE_LIMITS.maxDurationWeeks}
                  required
                  value={weeks}
                  onChange={(event) => setWeeks(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <p className="text-sm text-ink-600">
              Estimated total{" "}
              <span className="tabular font-semibold text-emerald-700">
                {formatCurrency(hourlyEstimate)}
              </span>
              <span className="text-ink-400"> · you pay for the hours you approve</span>
            </p>
          </>
        )}
      </FormSection>

      <FormSection title="Applications" description="One freelancer is selected.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="applicationDeadline" label="Application deadline">
            <input
              id="applicationDeadline"
              name="applicationDeadline"
              type="datetime-local"
              required
              className={inputClass}
            />
          </Field>
          <Field
            id="maxApplicants"
            label="Applicant limit"
            optional
            hint="Leave empty for no limit."
          >
            <input
              id="maxApplicants"
              name="maxApplicants"
              type="number"
              min={1}
              max={MAX_APPLICANTS_LIMIT}
              className={inputClass}
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
        <p className="text-sm text-ink-500">
          Paid contract ·{" "}
          <span className="font-medium text-ink-800">one freelancer is selected</span>
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {pending ? "Publishing…" : "Publish contract"}
        </Button>
      </div>
    </form>
  );
}
