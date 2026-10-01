import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applicationHref, applicationStage } from "../lib/applications";
import {
  hireStage,
  hiringState,
  inHireTab,
  isActiveHiring,
  pipelineHref,
  pipelineStage,
} from "../lib/company";
import { filterProjects, parseProjectFilters } from "../lib/projects";
import { createHiringSchema } from "../lib/validations/project";
import { saveAssessmentSchema } from "../lib/validations/application";
import type { ApplicationSummaryView } from "../lib/types/domain";

const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
const later = new Date(Date.now() + 14 * 86_400_000).toISOString();

const role = {
  title: "Frontend Developer",
  category: "frontend",
  jobType: "full_time",
  workArrangement: "remote",
  experienceLevel: "junior",
  description: "Build the web app our customers use every day.",
  aboutRole: "You'll own the React front end, from design handoff to production.",
  responsibilities: ["Ship features"],
  requirements: ["React"],
  niceToHave: [],
  openings: 5,
  maxApplicants: 100,
  applicationDeadline: future,
  assessmentTitle: "Build a responsive analytics dashboard",
  assessmentType: "frontend",
  assessmentDescription: "Build a responsive dashboard using React and TypeScript.",
  assessmentRequirements: ["Authentication UI", "Dashboard layout"],
  deliverables: ["GitHub repository", "README"],
  assessmentTechnologies: ["React", "TypeScript"],
  evaluationCriteria: [],
  expectedHours: 6,
  assessmentDeadline: later,
};

describe("hire-only postings", () => {
  it("need openings and an application limit, and the limit covers the openings", () => {
    expect(createHiringSchema.safeParse(role).success).toBe(true);
    expect(createHiringSchema.safeParse({ ...role, maxApplicants: 3 }).success).toBe(
      false
    );
    expect(createHiringSchema.safeParse({ ...role, openings: 0 }).success).toBe(false);
  });

  it("must carry a hiring assessment", () => {
    for (const missing of [
      "assessmentTitle",
      "assessmentDescription",
      "assessmentRequirements",
      "deliverables",
      "assessmentDeadline",
    ]) {
      expect(
        createHiringSchema.safeParse({ ...role, [missing]: undefined }).success
      ).toBe(false);
    }
    expect(
      createHiringSchema.safeParse({ ...role, assessmentRequirements: [] }).success
    ).toBe(false);
  });

  it("keeps the assessment deadline on or after the application deadline", () => {
    expect(
      createHiringSchema.safeParse({ ...role, assessmentDeadline: future }).success
    ).toBe(true);
    const before = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(
      createHiringSchema.safeParse({ ...role, assessmentDeadline: before }).success
    ).toBe(false);
  });

  it("never carries a fee — the assessment is unpaid", () => {
    const parsed = createHiringSchema.parse(role);
    expect(parsed).not.toHaveProperty("paymentAmount");
    expect(parsed).not.toHaveProperty("currency");
  });
});

describe("the candidate's hiring stages", () => {
  it("runs Applied → Shortlisted → Interview → Selected, never a trial", () => {
    expect(applicationStage("submitted", "applications_open", null, "hire")).toBe(
      "applied"
    );
    expect(applicationStage("shortlisted", "applications_open", null, "hire")).toBe(
      "shortlisted"
    );
    expect(applicationStage("interview", "applications_open", null, "hire")).toBe(
      "interview"
    );
    expect(applicationStage("selected", "completed", null, "hire")).toBe("hired");
    // With an assessment: to do → in progress → submitted, then review.
    expect(
      applicationStage("submitted", "applications_open", null, "hire", "not_started")
    ).toBe("assessment_todo");
    expect(
      applicationStage("submitted", "applications_open", null, "hire", "in_progress")
    ).toBe("assessment_in_progress");
    expect(
      applicationStage("submitted", "applications_open", null, "hire", "submitted")
    ).toBe("assessment_submitted");
    expect(
      applicationStage("reviewing", "applications_open", null, "hire", "submitted")
    ).toBe("reviewing");
    // The same status on a build project is the start of paid work.
    expect(applicationStage("selected", "in_progress", "in_progress", "build")).toBe(
      "building"
    );
  });

  it("never sends a hired candidate to a trial workspace", () => {
    const application = (opportunityType: "hire" | "build"): ApplicationSummaryView => ({
      id: "a",
      status: "selected",
      decisionNote: null,
      workStatus: null,
      coverMessage: "",
      createdAt: future,
      project: {
        id: "p",
        slug: "role",
        title: "Role",
        status: "applications_open",
        paymentAmount: 0,
        currency: "INR",
        companyId: "c",
        companyName: "Acme",
        opportunityType,
      },
    });
    expect(applicationHref(application("hire"))).toBe("/projects/role");
    expect(applicationHref(application("build"))).toBe("/candidate/trials/p");
    const withAssessment = application("hire");
    withAssessment.project = { ...withAssessment.project!, hasAssessment: true };
    expect(applicationHref(withAssessment)).toBe("/candidate/assessments/p");
  });
});

describe("the company's hiring pipeline", () => {
  it("places hire applications in hiring stages and opens the application", () => {
    expect(pipelineStage("interview", null, "hire")).toBe("interview");
    expect(pipelineStage("selected", null, "hire")).toBe("hired");
    expect(
      pipelineHref({
        projectId: "p",
        applicationId: "a",
        candidateId: "c",
        applicationStatus: "selected",
        opportunityType: "hire",
      })
    ).toBe("/company/projects/p/applicants/a");
  });

  it("keeps a candidate in assessment until their work is in", () => {
    expect(pipelineStage("submitted", null, "hire", "not_started")).toBe("assessment");
    expect(pipelineStage("submitted", null, "hire", "in_progress")).toBe("assessment");
    expect(pipelineStage("submitted", null, "hire", "submitted")).toBe("new");
    // Roles without an assessment, and build projects, are unchanged.
    expect(pipelineStage("submitted", null, "hire", null)).toBe("new");
    expect(pipelineStage("submitted", null)).toBe("new");
  });

  it("reads each stage from the application and its assessment", () => {
    expect(hireStage("submitted", "not_started")).toBe("applied");
    expect(hireStage("submitted", "in_progress")).toBe("assessment_in_progress");
    expect(hireStage("submitted", "submitted")).toBe("assessment_submitted");
    expect(hireStage("reviewing", "submitted")).toBe("under_review");
    expect(hireStage("rejected", "submitted")).toBe("not_selected");
    expect(hireStage("selected", "submitted")).toBe("selected");
  });

  it("groups stages into the pipeline tabs", () => {
    expect(inHireTab("assessment", "applied")).toBe(true);
    expect(inHireTab("assessment", "assessment_in_progress")).toBe(true);
    expect(inHireTab("submitted", "assessment_submitted")).toBe(true);
    expect(inHireTab("interview", "shortlisted")).toBe(false);
    expect(inHireTab("all", "withdrawn")).toBe(true);
  });
});

describe("browsing by type", () => {
  const base = {
    title: "t",
    description: "d",
    companyName: "Acme",
    stack: [],
    category: "frontend" as const,
    expectedHours: 8,
    availability: "open" as const,
  };
  const roleRow = {
    ...base,
    opportunityType: "hire" as const,
    paymentAmount: 0,
    jobType: "full_time" as const,
    workArrangement: "remote" as const,
  };
  const projectRow = { ...base, opportunityType: "build" as const, paymentAmount: 5000 };

  it("filters to one type, and fee filters only ever match build projects", () => {
    expect(
      filterProjects([roleRow, projectRow], parseProjectFilters({ kind: "hire" }, []))
    ).toEqual([roleRow]);
    expect(
      filterProjects([roleRow, projectRow], parseProjectFilters({ pay: "2000" }, []))
    ).toEqual([projectRow]);
    expect(
      filterProjects([roleRow, projectRow], parseProjectFilters({ where: "remote" }, []))
    ).toEqual([roleRow]);
  });
});

describe("the hire-only migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261005000000_hire_only.sql"),
    "utf8"
  );

  it("keeps build projects to one candidate and hire postings free", () => {
    expect(sql).toContain("NEW.openings := 1;");
    expect(sql).toContain("NEW.payment_amount := 0;");
  });

  it("enforces the application limit and the openings in the database", () => {
    expect(sql).toContain("This role has reached its application limit.");
    expect(sql).toContain("Every opening for this role has been filled.");
    expect(sql).toMatch(/FOR UPDATE/);
  });

  it("adds the interview status outside the transaction", () => {
    expect(sql.indexOf("ADD VALUE IF NOT EXISTS 'interview'")).toBeLessThan(
      sql.indexOf("BEGIN;")
    );
  });
});

describe("a hire-only posting's lifecycle", () => {
  const now = new Date("2026-09-19T12:00:00Z");
  const posting = {
    status: "applications_open" as const,
    applicationDeadline: "2026-10-01T00:00:00Z",
    maxApplicants: 100,
    openings: 5,
    activeApplications: 73,
    hired: 0,
  };
  type Posting = Parameters<typeof hiringState>[0];
  const state = (changes: Partial<Posting>) =>
    hiringState({ ...posting, ...changes }, now);

  it("is open while it takes applications", () => {
    expect(state({})).toBe("open");
  });

  it("is full at the limit, and open again after a withdrawal frees a place", () => {
    expect(state({ activeApplications: 100 })).toBe("applications_full");
    expect(state({ activeApplications: 99 })).toBe("open");
  });

  it("is partially filled once some openings are filled", () => {
    expect(state({ hired: 3 })).toBe("partially_filled");
  });

  it("is complete when every opening is filled — full or not", () => {
    expect(state({ hired: 5 })).toBe("completed");
    expect(state({ hired: 5, activeApplications: 100 })).toBe("completed");
    expect(state({ status: "completed", hired: 5 })).toBe("completed");
  });

  it("is closed when the company closes it, however many were hired", () => {
    expect(state({ status: "cancelled", hired: 2 })).toBe("closed");
  });

  it("keeps hiring from those received after the deadline", () => {
    expect(state({ applicationDeadline: "2026-09-01T00:00:00Z" })).toBe("hiring");
    expect(state({ applicationDeadline: "2026-09-01T00:00:00Z", hired: 1 })).toBe(
      "partially_filled"
    );
  });

  it("stalls after the deadline once nobody is left in the running", () => {
    const past = { applicationDeadline: "2026-09-01T00:00:00Z" };
    expect(state({ ...past, inRunning: 0 })).toBe("stalled");
    expect(state({ ...past, inRunning: 2 })).toBe("hiring");
    // Unknown (not counted) behaves as before.
    expect(state(past)).toBe("hiring");
    // Before the deadline, an empty pipeline is just an open role.
    expect(state({ inRunning: 0 })).toBe("open");
    // Every opening filled is complete, not stalled.
    expect(state({ ...past, inRunning: 0, hired: 5 })).toBe("completed");
  });

  it("is private while hidden", () => {
    expect(state({ status: "draft" })).toBe("private");
  });

  it("only stays on the company's desk until it completes or closes", () => {
    expect(isActiveHiring("applications_full")).toBe(true);
    expect(isActiveHiring("completed")).toBe(false);
    expect(isActiveHiring("closed")).toBe(false);
    expect(isActiveHiring("stalled")).toBe(false);
  });
});

describe("the lifecycle migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261006000000_hiring_lifecycle.sql"),
    "utf8"
  );

  it("stamps closed_at in the database, not from the client", () => {
    expect(sql).toContain("BEFORE UPDATE ON public.projects");
    expect(sql).toContain("NEW.closed_at :=");
  });

  it("never tells a hired candidate their application closed", () => {
    expect(sql).toContain("a.status::text NOT IN ('selected', 'rejected')");
  });

  it("keeps who was hired out of the public history", () => {
    const history = sql.slice(
      sql.indexOf("CREATE OR REPLACE FUNCTION public.company_history")
    );
    expect(history).not.toMatch(/full_name|candidate_id/);
  });
});

describe("saving an assessment", () => {
  const input = {
    projectId: "9f59a967-7782-4975-bac4-1ff6cc8e765d",
    repositoryUrl: "https://github.com/me/dashboard",
    liveUrl: "",
    notes: "",
    completedRequirements: ["0", "2"],
    submit: false,
  };

  it("takes links, notes and ticked requirements", () => {
    const parsed = saveAssessmentSchema.parse(input);
    expect(parsed.liveUrl).toBeNull();
    expect(parsed.notes).toBeNull();
    expect(parsed.completedRequirements).toEqual([0, 2]);
  });

  it("only accepts web links", () => {
    expect(
      saveAssessmentSchema.safeParse({ ...input, repositoryUrl: "javascript:alert(1)" })
        .success
    ).toBe(false);
  });
});

describe("the assessment migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261007000000_hiring_assessment.sql"),
    "utf8"
  );

  it("requires an assessment on every new hire posting, and keeps it unpaid", () => {
    expect(sql).toContain("A hiring opportunity needs an assessment");
    expect(sql).toContain("NEW.payment_amount := 0;");
  });

  it("lets nobody write submissions except through save_assessment", () => {
    expect(sql).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.assessment_submissions FROM anon, authenticated;"
    );
    expect(sql).toContain("You've already submitted this assessment.".replace("'", "''"));
    expect(sql).toContain("The assessment deadline has passed.");
  });

  it("won't move a candidate forward before their assessment is in", () => {
    expect(sql).toContain(
      "Wait for the candidate to submit their assessment before moving them forward."
    );
  });

  it("gives everyone still waiting a decision when the last opening fills", () => {
    const decision = sql.slice(
      sql.indexOf("CREATE OR REPLACE FUNCTION public.apply_application_decision")
    );
    expect(decision).toMatch(/SET status = 'rejected'/);
    expect(decision).toContain(
      "status::text IN ('submitted', 'reviewing', 'shortlisted', 'interview')"
    );
  });
});
