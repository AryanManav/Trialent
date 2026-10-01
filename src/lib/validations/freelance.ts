import { z } from "zod";
import {
  FREELANCE_LIMITS,
  MAX_APPLICANTS_LIMIT,
  PROJECT_CATEGORIES,
} from "@/lib/constants";
import type { ProjectCategory } from "@/lib/types/database.types";

/** An http(s) link, or nothing. `.url()` alone also accepts javascript: URLs. */
const optionalHttpUrl = z
  .string()
  .trim()
  .max(500, "Keep the link under 500 characters")
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), {
    message: "Links must start with http:// or https://",
  })
  .transform((value) => value || null);

const futureDateTime = (message: string) =>
  z
    .string()
    .datetime({ message })
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: `${message.replace(/^Invalid /, "The ")} must be in the future`,
    });

export const milestoneInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Give every milestone a title")
    .max(150, "Keep milestone titles under 150 characters"),
  description: z.string().trim().max(2000).optional().default(""),
  amount: z.coerce
    .number({ invalid_type_error: "Give every milestone an amount" })
    .int("Milestone amounts are whole rupees")
    .min(
      FREELANCE_LIMITS.minMilestoneAmount,
      `Each milestone is at least ₹${FREELANCE_LIMITS.minMilestoneAmount}`
    ),
  dueDate: z.string().datetime({ message: "Give every milestone a due date" }),
});

export type MilestoneInput = z.infer<typeof milestoneInputSchema>;

const freelanceBase = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(150),
  category: z.enum(
    Object.keys(PROJECT_CATEGORIES) as [ProjectCategory, ...ProjectCategory[]],
    { errorMap: () => ({ message: "Choose the work's topic" }) }
  ),
  description: z.string().trim().min(20, "Summarise the contract in a sentence or two"),
  problemStatement: z
    .string()
    .trim()
    .min(30, "Describe the work in a little more detail (at least 30 characters)"),
  context: z
    .string()
    .trim()
    .min(
      30,
      "Add context: your product, the codebase or tools, and who they'll work with"
    ),
  requirements: z
    .array(z.string().min(2))
    .min(1, "List at least one skill or requirement"),
  deliverables: z.array(z.string().min(2)).min(1, "List at least one deliverable"),
  maxApplicants: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number()
      .int("Applicant limit must be a whole number")
      .min(1, "Allow at least 1 applicant")
      .max(MAX_APPLICANTS_LIMIT, `At most ${MAX_APPLICANTS_LIMIT} applicants`)
      .optional()
  ),
  applicationDeadline: futureDateTime("Invalid application deadline"),
});

const fixedPrice = freelanceBase.extend({
  pricingModel: z.literal("fixed"),
  expectedHours: z.coerce
    .number({ invalid_type_error: "Estimate the total hours" })
    .int("Estimate whole hours")
    .min(1, "Estimate at least 1 hour")
    .max(1000, "At most 1,000 hours"),
  milestones: z
    .array(milestoneInputSchema)
    .min(FREELANCE_LIMITS.minMilestones, "Add at least one milestone")
    .max(
      FREELANCE_LIMITS.maxMilestones,
      `At most ${FREELANCE_LIMITS.maxMilestones} milestones`
    ),
});

const hourly = freelanceBase.extend({
  pricingModel: z.literal("hourly"),
  hourlyRate: z.coerce
    .number({ invalid_type_error: "Set an hourly rate" })
    .int("The rate is whole rupees")
    .min(
      FREELANCE_LIMITS.minHourlyRate,
      `The hourly rate is at least ₹${FREELANCE_LIMITS.minHourlyRate}`
    )
    .max(FREELANCE_LIMITS.maxHourlyRate, "That hourly rate is too high"),
  hoursPerWeek: z.coerce
    .number({ invalid_type_error: "Set hours per week" })
    .int("Hours per week must be whole hours")
    .min(1, "At least 1 hour a week")
    .max(
      FREELANCE_LIMITS.maxHoursPerWeek,
      `At most ${FREELANCE_LIMITS.maxHoursPerWeek} hours a week`
    ),
  durationWeeks: z.coerce
    .number({ invalid_type_error: "Set the contract length" })
    .int("The length is whole weeks")
    .min(1, "At least 1 week")
    .max(
      FREELANCE_LIMITS.maxDurationWeeks,
      `At most ${FREELANCE_LIMITS.maxDurationWeeks} weeks`
    ),
});

export const createFreelanceSchema = z
  .discriminatedUnion("pricingModel", [fixedPrice, hourly], {
    errorMap: () => ({ message: "Choose fixed price or hourly" }),
  })
  .superRefine((data, ctx) => {
    if (data.pricingModel !== "fixed") return;
    const applyBy = new Date(data.applicationDeadline).getTime();
    data.milestones.forEach((milestone, index) => {
      if (new Date(milestone.dueDate).getTime() <= applyBy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Milestone ${index + 1} is due before applications close`,
          path: ["milestones", index, "dueDate"],
        });
      }
    });
  });

export type CreateFreelanceInput = z.infer<typeof createFreelanceSchema>;

export const submitMilestoneSchema = z.object({
  milestoneId: z.string().uuid("Invalid milestone"),
  workUrl: optionalHttpUrl,
  note: z
    .string()
    .trim()
    .min(10, "Describe what you delivered (at least 10 characters)")
    .max(4000),
});

export const logHoursSchema = z.object({
  projectId: z.string().uuid("Invalid contract"),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the week you worked")
    .refine((value) => new Date(`${value}T00:00:00Z`).getTime() <= Date.now(), {
      message: "You can't log a week that hasn't started",
    }),
  hours: z.coerce
    .number({ invalid_type_error: "Enter the hours you worked" })
    .min(0.5, "Log at least half an hour")
    .max(
      FREELANCE_LIMITS.maxLoggedHours,
      `At most ${FREELANCE_LIMITS.maxLoggedHours} hours in a week`
    ),
  note: z
    .string()
    .trim()
    .min(10, "Describe the work you did (at least 10 characters)")
    .max(4000),
  workUrl: optionalHttpUrl,
});

export const reviewMilestoneSchema = z
  .object({
    milestoneId: z.string().uuid("Invalid milestone"),
    decision: z.enum(["approved", "changes_requested"], {
      errorMap: () => ({ message: "Approve the work or ask for changes" }),
    }),
    note: z.string().trim().max(2000).optional().default(""),
  })
  .refine((data) => data.decision === "approved" || data.note.length >= 10, {
    message: "Say what needs to change (at least 10 characters)",
    path: ["note"],
  });

export const milestoneIdSchema = z.object({
  milestoneId: z.string().uuid("Invalid milestone"),
});

export const contractIdSchema = z.object({
  projectId: z.string().uuid("Invalid contract"),
});
