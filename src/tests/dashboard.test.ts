import { describe, expect, it } from "vitest";
import { dueLabel, greetingFor, nextActionFor } from "../lib/next-action";
import { filterProjects, hasActiveFilters, parseProjectFilters } from "../lib/projects";
import type { ApplicationSummaryView, TrialView } from "../lib/types/domain";

const NOW = new Date("2026-09-19T12:00:00Z");

const trial = (overrides: Partial<TrialView>): TrialView => ({
  projectId: "p1",
  workStatus: "in_progress",
  companyId: "c1",
  title: "Kanban board",
  slug: "kanban",
  companyName: "Acme",
  status: "in_progress",
  paymentAmount: 5000,
  currency: "INR",
  expectedHours: 8,
  projectDeadline: "2026-09-20T12:00:00Z",
  selectedAt: "2026-09-10T00:00:00Z",
  opportunityType: "build",
  ...overrides,
});

const application = (
  status: ApplicationSummaryView["status"]
): ApplicationSummaryView => ({
  id: "a1",
  status,
  decisionNote: null,
  workStatus: null,
  coverMessage: "",
  createdAt: "2026-09-18T00:00:00.000Z",
  project: {
    id: "p9",
    slug: "p9",
    title: "Other",
    status: "applications_open",
    paymentAmount: 3000,
    currency: "INR",
    companyId: "c2",
    companyName: "Beta",
    opportunityType: "build",
  },
});

describe("next action", () => {
  it("puts a requested revision ahead of everything else", () => {
    const next = nextActionFor(
      [
        trial({ projectId: "a" }),
        trial({ projectId: "b", workStatus: "revision_requested" }),
      ],
      [],
      NOW
    );
    expect(next.kind).toBe("revise");
    expect(next.href).toBe("/candidate/trials/b");
  });

  it("sends an active trial to its workspace, soonest deadline first", () => {
    const next = nextActionFor(
      [
        trial({ projectId: "later", projectDeadline: "2026-09-25T12:00:00Z" }),
        trial({ projectId: "sooner", projectDeadline: "2026-09-20T12:00:00Z" }),
      ],
      [],
      NOW
    );
    expect(next).toMatchObject({ kind: "submit", detail: "Due tomorrow" });
    expect(next.trial?.projectId).toBe("sooner");
  });

  it("falls back to pending applications, then to browsing", () => {
    expect(nextActionFor([], [application("reviewing")], NOW).kind).toBe("pending");
    expect(nextActionFor([], [], NOW)).toMatchObject({
      kind: "caught_up",
      href: "/projects",
    });
  });

  it("ignores finished work", () => {
    expect(nextActionFor([trial({ workStatus: "completed" })], [], NOW).kind).toBe(
      "caught_up"
    );
  });

  it("labels deadlines in days", () => {
    expect(dueLabel("2026-09-19T20:00:00Z", NOW)).toBe("Due tomorrow");
    expect(dueLabel("2026-09-24T12:00:00Z", NOW)).toBe("Due in 5 days");
    expect(dueLabel("2026-09-17T12:00:00Z", NOW)).toBe("Overdue by 2 days");
  });

  it("greets by the Indian clock", () => {
    // 12:00 UTC is 17:30 in India.
    expect(greetingFor(NOW)).toBe("Good evening");
    expect(greetingFor(new Date("2026-09-19T03:00:00Z"))).toBe("Good morning");
  });
});

describe("browse filters", () => {
  const project = (overrides: Record<string, unknown>) => ({
    title: "Kanban board",
    description: "Real-time collaboration",
    companyName: "Acme",
    stack: ["React", "Socket.io"],
    category: "frontend" as const,
    paymentAmount: 5000,
    expectedHours: 8,
    availability: "open" as const,
    ...overrides,
  });

  it("parses only known values", () => {
    const filters = parseProjectFilters(
      { q: "  react  ", category: "nope", pay: "-5", hours: "10", open: "1" },
      ["frontend"]
    );
    expect(filters).toEqual({
      q: "react",
      category: null,
      type: null,
      jobType: null,
      workArrangement: null,
      minPay: null,
      maxHours: 10,
      openOnly: true,
    });
    expect(hasActiveFilters(filters)).toBe(true);
  });

  it("matches every search word across title, company and stack", () => {
    const filters = parseProjectFilters({ q: "acme socket" }, []);
    expect(filterProjects([project({})], filters)).toHaveLength(1);
    expect(
      filterProjects([project({})], parseProjectFilters({ q: "acme vue" }, []))
    ).toHaveLength(0);
  });

  it("applies fee, effort and availability limits", () => {
    const list = [
      project({ paymentAmount: 1000 }),
      project({ expectedHours: 30 }),
      project({ availability: "full" }),
      project({}),
    ];
    const filters = parseProjectFilters({ pay: "2000", hours: "10", open: "1" }, []);
    expect(filterProjects(list, filters)).toHaveLength(1);
  });
});
