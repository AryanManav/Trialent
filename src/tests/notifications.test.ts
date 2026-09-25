import { describe, it, expect } from "vitest";
import { countUnreadUnder, unreadByProject } from "../lib/notifications";
import { markNotificationsReadSchema } from "../lib/validations/notification";
import { formatRelativeTime, isInternalPath } from "../lib/utils";
import type { UnreadMarker } from "../lib/types/domain";

const PROJECT_A = "9f59a967-7782-4975-bac4-1ff6cc8e765d";
const PROJECT_B = "e7a36212-771d-4fdc-84ef-83378c517d94";

const unread: UnreadMarker[] = [
  {
    id: "1",
    type: "application_received",
    projectId: PROJECT_A,
    linkUrl: `/company/projects/${PROJECT_A}/applicants/x`,
  },
  {
    id: "2",
    type: "message",
    projectId: PROJECT_A,
    linkUrl: `/company/projects/${PROJECT_A}/review`,
  },
  {
    id: "3",
    type: "work_submitted",
    projectId: PROJECT_B,
    linkUrl: "/company/projects-archive",
  },
  { id: "4", type: "other", projectId: null, linkUrl: null },
];

describe("notification badges", () => {
  it("counts only links under a section, not look-alike paths", () => {
    expect(countUnreadUnder(unread, "/company/projects")).toBe(2);
    expect(countUnreadUnder(unread, `/company/projects/${PROJECT_A}/review`)).toBe(1);
    expect(countUnreadUnder(unread, "/candidate/trials")).toBe(0);
  });

  it("groups unread notifications by project and skips unattached ones", () => {
    expect(unreadByProject(unread)).toEqual({ [PROJECT_A]: 2, [PROJECT_B]: 1 });
  });
});

describe("marking notifications read", () => {
  it("accepts each supported scope", () => {
    for (const scope of [
      { notificationId: PROJECT_A },
      { projectId: PROJECT_A },
      { link: `/company/projects/${PROJECT_A}` },
      { linkPrefix: "/candidate/applications" },
      { all: true },
    ]) {
      expect(markNotificationsReadSchema.safeParse(scope).success).toBe(true);
    }
  });

  it("rejects external links and LIKE wildcards", () => {
    for (const scope of [
      { link: "https://evil.example" },
      { link: "//evil.example" },
      { linkPrefix: "/%" },
      { linkPrefix: "/candidate/_" },
      { all: false },
      { projectId: "not-a-uuid" },
    ]) {
      expect(markNotificationsReadSchema.safeParse(scope).success).toBe(false);
    }
  });
});

describe("notification formatting", () => {
  it("only treats same-origin paths as internal", () => {
    expect(isInternalPath("/company/projects")).toBe(true);
    expect(isInternalPath("//evil.example")).toBe(false);
    expect(isInternalPath("https://evil.example")).toBe(false);
    expect(isInternalPath("/\\evil.example")).toBe(false);
    expect(isInternalPath("/\t/evil.example")).toBe(false);
    expect(isInternalPath("/\n/evil.example")).toBe(false);
    expect(isInternalPath("/company/projects?tab=open#top")).toBe(true);
    expect(isInternalPath(null)).toBe(false);
  });

  it("describes recent times relatively", () => {
    const now = new Date("2026-09-18T12:00:00.000Z");
    expect(formatRelativeTime("2026-09-18T11:59:40.000Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-09-18T11:55:00.000Z", now)).toBe("5 min ago");
    expect(formatRelativeTime("2026-09-18T09:00:00.000Z", now)).toBe("3 h ago");
    expect(formatRelativeTime("2026-09-17T12:00:00.000Z", now)).toBe("1 day ago");
  });
});
