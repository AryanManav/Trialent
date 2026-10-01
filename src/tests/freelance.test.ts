import { describe, expect, it } from "vitest";
import {
  canCompleteContract,
  contractTotals,
  describeTerms,
  hasApprovedWork,
  isContractActive,
  toFreelanceTerms,
  weekStartOf,
} from "../lib/freelance";
import { workHref } from "../lib/applications";
import { listingTerms, parseProjectFilters } from "../lib/projects";
import { parseIndiaDateTime } from "../lib/utils";
import {
  createFreelanceSchema,
  logHoursSchema,
  reviewMilestoneSchema,
  submitMilestoneSchema,
} from "../lib/validations";
import type { MilestoneView } from "../lib/types/domain";

const MILESTONE_ID = "9f59a967-7782-4975-bac4-1ff6cc8e765d";
const PROJECT_ID = "e7a36212-771d-4fdc-84ef-83378c517d94";
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

const milestone = (
  status: MilestoneView["status"],
  amount: number,
  extra: Partial<MilestoneView> = {}
) => ({ status, amount, hours: null, paymentConfirmedAt: null, ...extra });

const brief = {
  title: "Build the admin panel",
  category: "full_stack",
  description: "An admin panel for our booking app's operations team.",
  problemStatement: "Our ops team edits bookings directly in the database today.",
  context: "Next.js app, Postgres, three people on the team, async on Slack.",
  requirements: ["Next.js", "Postgres"],
  deliverables: ["Pull request with the panel"],
  applicationDeadline: inDays(5),
};

describe("freelance terms", () => {
  it("only reads terms off freelance rows", () => {
    expect(
      toFreelanceTerms({ opportunity_type: "build", pricing_model: null })
    ).toBeNull();
    expect(
      toFreelanceTerms({
        opportunity_type: "freelance",
        pricing_model: "hourly",
        hourly_rate: 800,
        hours_per_week: 10,
        duration_weeks: 8,
      })
    ).toEqual({
      pricingModel: "hourly",
      hourlyRate: 800,
      hoursPerWeek: 10,
      durationWeeks: 8,
    });
  });

  it("describes hourly and fixed-price contracts", () => {
    expect(
      describeTerms(
        { pricingModel: "hourly", hourlyRate: 800, hoursPerWeek: 10, durationWeeks: 1 },
        8000,
        "INR"
      )
    ).toBe("₹800/hr · 10 h a week · 1 week");
    expect(
      describeTerms(
        {
          pricingModel: "fixed",
          hourlyRate: null,
          hoursPerWeek: null,
          durationWeeks: null,
        },
        24000,
        "INR"
      )
    ).toBe("Fixed price · ₹24,000");
  });
});

describe("contract totals", () => {
  it("splits money by how far each milestone has got", () => {
    const totals = contractTotals(
      [
        milestone("paid", 5000, { paymentConfirmedAt: "2026-10-01T00:00:00Z" }),
        milestone("paid", 3000),
        milestone("approved", 4000),
        milestone("submitted", 2000),
        milestone("planned", 6000),
        milestone("cancelled", 1000),
      ],
      20000
    );
    expect(totals).toEqual({
      agreed: 20000,
      inReview: 2000,
      due: 4000,
      paid: 8000,
      confirmed: 5000,
      hoursLogged: 0,
    });
  });

  it("adds up logged hours, ignoring cancelled logs", () => {
    const totals = contractTotals(
      [
        milestone("submitted", 4000, { hours: 5 }),
        milestone("approved", 2400, { hours: 3 }),
        milestone("cancelled", 800, { hours: 1 }),
      ],
      64000
    );
    expect(totals.hoursLogged).toBe(8);
  });

  it("knows when there's approved work", () => {
    expect(hasApprovedWork([{ status: "planned" }, { status: "submitted" }])).toBe(false);
    expect(hasApprovedWork([{ status: "paid" }])).toBe(true);
  });
});

describe("contract lifecycle", () => {
  it("is active only between selection and ending", () => {
    expect(isContractActive(null)).toBe(false);
    expect(isContractActive("in_progress")).toBe(true);
    expect(isContractActive("completed")).toBe(false);
    expect(isContractActive("cancelled")).toBe(false);
  });

  it("can't be ended while delivered work waits for review", () => {
    expect(canCompleteContract("in_progress", [{ status: "approved" }])).toBe(true);
    expect(canCompleteContract("in_progress", [{ status: "submitted" }])).toBe(false);
    expect(canCompleteContract("completed", [{ status: "approved" }])).toBe(false);
  });

  it("logs a week from its Monday", () => {
    expect(weekStartOf(new Date(2026, 9, 1))).toBe("2026-09-28"); // a Thursday
    expect(weekStartOf(new Date(2026, 8, 28))).toBe("2026-09-28"); // the Monday itself
    expect(weekStartOf(new Date(2026, 9, 4))).toBe("2026-09-28"); // the Sunday after
  });

  it("sends freelancers to their contract, builders to their trial", () => {
    expect(workHref("p1", "freelance")).toBe("/candidate/contracts/p1");
    expect(workHref("p1", "build")).toBe("/candidate/trials/p1");
  });

  it("filters Browse to freelance contracts", () => {
    expect(parseProjectFilters({ kind: "freelance" }, []).type).toBe("freelance");
    expect(parseProjectFilters({ kind: "gig" }, []).type).toBeNull();
  });
});

describe("posting a contract", () => {
  it("accepts a fixed-price contract with milestones", () => {
    const result = createFreelanceSchema.safeParse({
      ...brief,
      pricingModel: "fixed",
      expectedHours: "30",
      milestones: [
        { title: "Bookings list", amount: "8000", dueDate: inDays(12), description: "" },
        { title: "Edit and refund", amount: "12000", dueDate: inDays(20) },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("needs at least one milestone, each due after applications close", () => {
    expect(
      createFreelanceSchema.safeParse({
        ...brief,
        pricingModel: "fixed",
        expectedHours: "30",
        milestones: [],
      }).success
    ).toBe(false);

    const early = createFreelanceSchema.safeParse({
      ...brief,
      pricingModel: "fixed",
      expectedHours: "30",
      milestones: [{ title: "Too soon", amount: "8000", dueDate: inDays(2) }],
    });
    expect(early.success).toBe(false);
    expect(early.error?.errors[0].message).toMatch(/before applications close/);
  });

  it("refuses milestones below the minimum amount", () => {
    const result = createFreelanceSchema.safeParse({
      ...brief,
      pricingModel: "fixed",
      expectedHours: "5",
      milestones: [{ title: "Tiny", amount: "100", dueDate: inDays(12) }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an hourly contract and checks its bounds", () => {
    const hourly = {
      ...brief,
      pricingModel: "hourly",
      hoursPerWeek: "10",
      durationWeeks: "8",
    };
    expect(
      createFreelanceSchema.safeParse({ ...hourly, hourlyRate: "800" }).success
    ).toBe(true);
    expect(createFreelanceSchema.safeParse({ ...hourly, hourlyRate: "50" }).success).toBe(
      false
    );
    expect(
      createFreelanceSchema.safeParse({
        ...hourly,
        hourlyRate: "800",
        durationWeeks: "60",
      }).success
    ).toBe(false);
  });

  it("rejects an application deadline in the past", () => {
    const result = createFreelanceSchema.safeParse({
      ...brief,
      applicationDeadline: inDays(-1),
      pricingModel: "hourly",
      hourlyRate: "800",
      hoursPerWeek: "10",
      durationWeeks: "8",
    });
    expect(result.success).toBe(false);
  });
});

describe("working a contract", () => {
  it("only accepts http(s) links for delivered work", () => {
    const base = { milestoneId: MILESTONE_ID, note: "Shipped the bookings list." };
    expect(
      submitMilestoneSchema.safeParse({
        ...base,
        workUrl: "https://github.com/a/b/pull/1",
      }).success
    ).toBe(true);
    expect(submitMilestoneSchema.safeParse({ ...base, workUrl: "" }).success).toBe(true);
    expect(
      submitMilestoneSchema.safeParse({ ...base, workUrl: "javascript:alert(1)" }).success
    ).toBe(false);
  });

  it("asks for a reason when sending work back", () => {
    expect(
      reviewMilestoneSchema.safeParse({ milestoneId: MILESTONE_ID, decision: "approved" })
        .success
    ).toBe(true);
    expect(
      reviewMilestoneSchema.safeParse({
        milestoneId: MILESTONE_ID,
        decision: "changes_requested",
        note: "fix",
      }).success
    ).toBe(false);
    expect(
      reviewMilestoneSchema.safeParse({
        milestoneId: MILESTONE_ID,
        decision: "changes_requested",
        note: "The refund button doesn't update the total.",
      }).success
    ).toBe(true);
  });

  it("won't log hours for a week that hasn't started", () => {
    const base = {
      projectId: PROJECT_ID,
      hours: "6",
      note: "Built the filters.",
      workUrl: "",
    };
    expect(logHoursSchema.safeParse({ ...base, weekStart: "2026-09-28" }).success).toBe(
      true
    );
    expect(
      logHoursSchema.safeParse({ ...base, weekStart: inDays(14).slice(0, 10) }).success
    ).toBe(false);
    expect(
      logHoursSchema.safeParse({ ...base, weekStart: "2026-09-28", hours: "90" }).success
    ).toBe(false);
  });
});

describe("listing terms", () => {
  const base = {
    paymentAmount: 6000,
    currency: "INR",
    expectedHours: 8,
    compensation: null,
    assessmentTitle: null,
    freelance: null,
  };

  it("never shows a hire-only role as ₹0", () => {
    const terms = listingTerms({
      ...base,
      opportunityType: "hire",
      paymentAmount: 0,
      expectedHours: 6,
      compensation: "₹6–9 LPA",
      assessmentTitle: "Design a queue API",
    });
    expect(terms).toEqual({ price: "₹6–9 LPA", effort: "Role · ~6h unpaid assessment" });
    expect(
      listingTerms({ ...base, opportunityType: "hire", paymentAmount: 0 }).price
    ).toBe("Role");
  });

  it("shows a build project's fee and effort", () => {
    expect(listingTerms({ ...base, opportunityType: "build" })).toEqual({
      price: "₹6,000",
      effort: "8h of work",
    });
  });

  it("shows an hourly contract's rate and commitment", () => {
    const terms = listingTerms({
      ...base,
      opportunityType: "freelance",
      paymentAmount: 64000,
      freelance: {
        pricingModel: "hourly",
        hourlyRate: 800,
        hoursPerWeek: 10,
        durationWeeks: 8,
      },
    });
    expect(terms).toEqual({
      price: "₹800/hr",
      effort: "Freelance · 10h a week for 8 weeks",
    });
  });
});

describe("form date-times", () => {
  it("reads a datetime-local value as India time", () => {
    expect(parseIndiaDateTime("2026-10-12T18:00")?.toISOString()).toBe(
      "2026-10-12T12:30:00.000Z"
    );
    expect(parseIndiaDateTime("2026-10-12T18:00:30")?.toISOString()).toBe(
      "2026-10-12T12:30:30.000Z"
    );
  });

  it("leaves values with a zone alone and rejects junk", () => {
    expect(parseIndiaDateTime("2026-10-12T18:00:00.000Z")?.toISOString()).toBe(
      "2026-10-12T18:00:00.000Z"
    );
    expect(parseIndiaDateTime("next tuesday")).toBeNull();
    expect(parseIndiaDateTime("")).toBeNull();
  });
});
