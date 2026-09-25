import type {
  AssessmentType,
  CompanyWorkStyle,
  ExperienceLevel,
  JobType,
  OpportunityType,
  WorkArrangement,
  ProjectCategory,
  SelectionWorkStatus,
  ApplicationStatus,
  ProjectOutcomeType,
  ProjectStatus,
  UserRole,
} from "@/lib/types/database.types";

export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin",
  company: "/company/dashboard",
  candidate: "/candidate/dashboard",
};

export function dashboardFor(role: UserRole): string {
  return DASHBOARD_BY_ROLE[role] ?? DASHBOARD_BY_ROLE.candidate;
}

/**
 * users.role is the source of truth. user_metadata is writable by the user
 * (supabase.auth.updateUser), so when it is the only thing available it may
 * yield candidate or company — never admin.
 */
export function resolveUserRole(
  dbRole: UserRole | null | undefined,
  metadataRole: unknown
): UserRole {
  if (dbRole) return dbRole;
  return metadataRole === "company" ? "company" : "candidate";
}

export const PROFILE_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin",
  company: "/company/profile",
  candidate: "/candidate/profile",
};

export function profileFor(role: UserRole): string {
  return PROFILE_BY_ROLE[role] ?? PROFILE_BY_ROLE.candidate;
}

/** Statuses in which a project still accepts candidate applications. */
/**
 * Statuses Browse lists (until the application deadline): open ones, and ones
 * where a candidate was picked and the work is under way.
 */
export const BROWSABLE_PROJECT_STATUSES = [
  "published",
  "applications_open",
  "candidate_selected",
  "in_progress",
  "submitted",
  "under_review",
  "revision_requested",
] as const satisfies readonly ProjectStatus[];

/** Most applicants a company may allow on one project. */
export const MAX_APPLICANTS_LIMIT = 500;

export const OPEN_PROJECT_STATUSES = [
  "published",
  "applications_open",
] as const satisfies readonly ProjectStatus[];

/** Application statuses a company reviewer is allowed to set by hand, by type. */
export const BUILD_DECISIONS = [
  "reviewing",
  "selected",
  "rejected",
] as const satisfies readonly ApplicationStatus[];

/** The hiring pipeline: forward only, and Selected / Rejected are final. */
export const HIRE_DECISIONS = [
  "reviewing",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
] as const satisfies readonly ApplicationStatus[];

export const REVIEWABLE_APPLICATION_STATUSES = [
  "reviewing",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
] as const satisfies readonly ApplicationStatus[];

/** Labels for the company's decision controls. */
export const REVIEWABLE_STATUS_LABELS: Record<
  (typeof REVIEWABLE_APPLICATION_STATUSES)[number],
  string
> = {
  reviewing: "Reviewing",
  shortlisted: "Shortlist",
  interview: "Move to interview",
  selected: "Select",
  rejected: "Reject",
};

/**
 * The two kinds of opportunity. Build only is Trialent's paid project: one
 * selected candidate builds it and is paid. Hire only is free to post:
 * candidates apply to a role, complete its unpaid hiring assessment, and up to
 * N are hired on the work they submit.
 */
export const OPPORTUNITY_TYPES = {
  build: {
    label: "Build only",
    title: "Build a project",
    summary: "Get a real project completed by one selected candidate.",
    price: "Paid project · one candidate",
  },
  hire: {
    label: "Hire only",
    title: "Hire talent",
    summary:
      "Evaluate candidates through a project or assessment and hire the strongest for your openings.",
    price: "Free · several hires",
  },
} as const satisfies Record<OpportunityType, Record<string, string>>;

export const JOB_TYPES = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  contract: "Contract",
} as const satisfies Record<JobType, string>;

export const WORK_ARRANGEMENTS = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
} as const satisfies Record<WorkArrangement, string>;

export const EXPERIENCE_LEVELS = {
  entry: "Entry · 0–1 years",
  junior: "Junior · 0–2 years",
  mid: "Mid-level · 2–5 years",
  senior: "Senior · 5+ years",
} as const satisfies Record<ExperienceLevel, string>;

/** What a hire-only role's assessment asks candidates to do. */
export const ASSESSMENT_TYPES = {
  coding: "Coding project",
  frontend: "Frontend task",
  backend: "Backend task",
  full_stack: "Full-stack task",
  design: "Design task",
  data: "Data task",
  technical: "Technical assignment",
  other: "Other professional assessment",
} as const satisfies Record<AssessmentType, string>;

/**
 * Longest estimate a hiring assessment may carry. It's unpaid, and the public copy
 * promises "at most 8 hours" — change both together. The database enforces the same
 * cap on new postings (20261008000000_before_outreach_hardening.sql).
 */
export const MAX_ASSESSMENT_HOURS = 8;

/** Most people one hire-only posting can hire, and its application ceiling. */
export const MAX_HIRE_OPENINGS = 100;

/**
 * Applications a company has closed — kept, but moved out of the main list.
 * ("shortlisted" is no longer offered; older applications may still carry it.)
 */
export const CLOSED_APPLICATION_STATUSES = [
  "rejected",
  "withdrawn",
] as const satisfies readonly ApplicationStatus[];

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

/**
 * Deliberately descriptive rather than numeric.
 *
 * The product thesis is to capture observable evidence, not invented precision:
 * a 1–10 score implies a calibration nobody has yet. Revisit once enough
 * outcomes exist to show what actually predicts a hire.
 */
export const QUALITY_LEVELS = [
  "below_expectations",
  "meets_expectations",
  "exceeds_expectations",
] as const;

export type QualityLevel = (typeof QUALITY_LEVELS)[number];

/** What the reviewer would do next — the signal that matters commercially. */
export const HIRE_RECOMMENDATIONS = ["no", "talent_pool", "interview", "hire"] as const;

export type HireRecommendation = (typeof HIRE_RECOMMENDATIONS)[number];

/** Outcomes a company reviewer records by hand after an evaluation. */
export const RECORDABLE_OUTCOMES = [
  "no_hire",
  "interview",
  "hire",
  "talent_pool",
] as const satisfies readonly ProjectOutcomeType[];

export const CANDIDATE_ACTIVITY_TYPES = {
  profileUpdated: "profile_updated",
  skillAdded: "skill_added",
  portfolioUpdated: "portfolio_updated",
  applicationSubmitted: "application_submitted",
  workSubmitted: "project_submission",
  /** A selected candidate posting on the project thread. */
  workUpdate: "project_milestone",
  githubConnected: "github_connected",
} as const;

export type CandidateActivityType =
  (typeof CANDIDATE_ACTIVITY_TYPES)[keyof typeof CANDIDATE_ACTIVITY_TYPES];

export const DEFAULT_CURRENCY = "INR";

export interface NavLink {
  label: string;
  href: string;
  /**
   * Path prefixes that count as "inside" this item, for highlighting (and for
   * unread badges). Defaults to the href itself.
   */
  match?: string[];
  /** Only the exact path counts — for "Home" items that sit above other sections. */
  exact?: boolean;
}

/** Everything a signed-in role can reach from anywhere, in one place. */
export interface RoleNavigation {
  /** The workspace sidebar (desktop): every section of the role's own area. */
  sidebar: NavLink[];
  /** The navbar's links — the same on every page for this role. */
  primary: NavLink[];
  /** The one call to action in the navbar, if any. */
  action: NavLink | null;
  /** The phone's bottom bar (at most five). Search is added by the bar itself. */
  bottom: NavLink[];
  /** The avatar menu, above Sign out. */
  menu: NavLink[];
}

const CANDIDATE_WORK_PATHS = [
  "/candidate/applications",
  "/candidate/trials",
  "/candidate/completed",
];

const ROLE_NAVIGATION: Record<UserRole, RoleNavigation> = {
  candidate: {
    sidebar: [
      { label: "Dashboard", href: "/candidate/dashboard", exact: true },
      { label: "Browse", href: "/projects" },
      { label: "My applications", href: "/candidate/applications", exact: true },
      {
        label: "Assessments",
        href: "/candidate/applications?kind=hire",
        match: ["/candidate/applications", "/candidate/assessments"],
      },
      { label: "Active trials", href: "/candidate/trials" },
      { label: "Completed projects", href: "/candidate/completed" },
      { label: "My profile", href: "/candidate/profile" },
      { label: "Settings", href: "/candidate/settings" },
    ],
    primary: [
      { label: "Home", href: "/candidate/dashboard", exact: true },
      { label: "Projects", href: "/projects" },
      { label: "Companies", href: "/companies" },
      { label: "My work", href: "/candidate/applications", match: CANDIDATE_WORK_PATHS },
    ],
    action: null,
    bottom: [
      { label: "Home", href: "/candidate/dashboard", exact: true },
      { label: "Projects", href: "/projects" },
      {
        label: "My work",
        href: "/candidate/applications",
        match: CANDIDATE_WORK_PATHS,
      },
      { label: "Profile", href: "/candidate/profile" },
    ],
    menu: [
      { label: "My profile", href: "/candidate/profile" },
      { label: "My work", href: "/candidate/applications" },
      { label: "Settings", href: "/candidate/settings" },
    ],
  },
  company: {
    sidebar: [
      { label: "Overview", href: "/company/dashboard", exact: true },
      { label: "Hiring", href: "/company/projects?type=hire" },
      { label: "Build projects", href: "/company/projects?type=build" },
      { label: "Applicants", href: "/company/candidates" },
      { label: "History", href: "/company/history" },
      { label: "Company profile", href: "/company/profile" },
      { label: "Settings", href: "/company/settings" },
    ],
    primary: [
      { label: "Overview", href: "/company/dashboard", exact: true },
      { label: "Opportunities", href: "/company/projects" },
      { label: "Applicants", href: "/company/candidates" },
      { label: "History", href: "/company/history" },
      { label: "Discover talent", href: "/search?type=candidates", match: ["/search"] },
    ],
    action: { label: "Create opportunity", href: "/company/projects/create" },
    bottom: [
      { label: "Home", href: "/company/dashboard", exact: true },
      { label: "Projects", href: "/company/projects" },
      { label: "Candidates", href: "/company/candidates" },
      { label: "Company", href: "/company/profile" },
    ],
    menu: [
      { label: "Company profile", href: "/company/profile" },
      { label: "Team", href: "/company/profile/team" },
      { label: "Settings", href: "/company/settings" },
    ],
  },
  admin: {
    sidebar: [],
    primary: [
      { label: "Overview", href: "/admin", exact: true },
      { label: "Users", href: "/admin/users" },
      { label: "Companies", href: "/admin/companies" },
    ],
    action: null,
    bottom: [
      { label: "Overview", href: "/admin", exact: true },
      { label: "Users", href: "/admin/users" },
      { label: "Companies", href: "/admin/companies" },
    ],
    menu: [{ label: "Admin overview", href: "/admin" }],
  },
};

const VISITOR_NAVIGATION: NavLink[] = [
  { label: "Projects", href: "/projects" },
  { label: "How it works", href: "/how-it-works" },
  { label: "For candidates", href: "/for-candidates" },
  { label: "For startups", href: "/for-companies" },
];

/** The role's whole navigation; null for visitors (see primaryNavFor). */
export function navigationFor(role: UserRole | null | undefined): RoleNavigation | null {
  return role ? ROLE_NAVIGATION[role] : null;
}

/** The navbar's links for a role, or the marketing links for visitors. */
export function primaryNavFor(role: UserRole | null | undefined): NavLink[] {
  return navigationFor(role)?.primary ?? VISITOR_NAVIGATION;
}

/** The one call to action a role gets in the navbar, if any. */
export function navbarActionFor(role: UserRole | null | undefined): NavLink | null {
  return navigationFor(role)?.action ?? null;
}

/** True when `pathname` is inside a nav item (its href or any `match` prefix). */
export function isNavActive(link: NavLink, pathname: string): boolean {
  const prefixes = link.match ?? [link.href.split("?")[0]];
  return prefixes.some(
    (prefix) => pathname === prefix || (!link.exact && pathname.startsWith(`${prefix}/`))
  );
}

export const PROFILE_MEDIA_BUCKET = "profile-media";

/** Each kind is stored at a fixed path so a new upload replaces the old one. */
export const PROFILE_MEDIA = {
  avatar: { maxBytes: 2 * 1024 * 1024, label: "Profile photo" },
  banner: { maxBytes: 5 * 1024 * 1024, label: "Banner" },
  logo: { maxBytes: 2 * 1024 * 1024, label: "Company logo" },
} as const;

export type ProfileMediaKind = keyof typeof PROFILE_MEDIA;

export const PROFILE_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** Social sign-in providers, by Supabase provider id. */
export const OAUTH_PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]["id"];

/** Applications a candidate may still withdraw — never once selected. */
export const WITHDRAWABLE_APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "shortlisted",
] as const satisfies readonly ApplicationStatus[];

export const WORK_MODES = {
  local: {
    label: "Build locally",
    description: "The candidate works in their own tools and submits a repository.",
    available: true,
  },
  in_app: {
    label: "Build in Trialent",
    description: "The candidate builds inside Trialent's editor.",
    available: false,
  },
} as const;

export const SUBMISSION_FILES_BUCKET = "submission-files";

/**
 * Attachments sit beside the required repository. The allowlist leaves out
 * anything a browser would render or execute (html, svg, js).
 */
export const SUBMISSION_ATTACHMENTS = {
  maxFiles: 5,
  maxBytes: 25 * 1024 * 1024,
  extensions: ["pdf", "zip", "ipynb", "csv", "md", "txt", "png", "jpg", "jpeg"],
} as const;

/**
 * Kinds of in-app notification. Rows are written only by database triggers
 * (`20260921000000_notifications.sql`); these are the `type` values they use.
 */
export const NOTIFICATION_TYPES = [
  "application_received",
  "application_withdrawn",
  "application_status",
  "work_submitted",
  "submission_status",
  "message",
  "feedback",
  "outcome",
  "new_project",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** How often an open tab re-checks for new notifications. */
export const NOTIFICATION_POLL_MS = 30_000;

/** Polled by open tabs for the current user's notification summary. */
export const NOTIFICATIONS_API_PATH = "/api/notifications";

/**
 * A trial is over once its project reaches one of these: it leaves Trial
 * Projects and shows as finished in My Applications.
 */
export const CLOSED_PROJECT_STATUSES = [
  "completed",
  "cancelled",
] as const satisfies readonly ProjectStatus[];

/** Headcount bands offered on the company profile. */
export const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "500+"] as const;

/** A company's public profile, where candidates check a startup before applying. */
export function companyProfilePath(companyId: string): string {
  return `/companies/${companyId}`;
}

/**
 * Short-lived cookie carrying the sign-up role and post-login destination
 * across an OAuth round trip. The redirect URL can't carry them reliably:
 * Supabase drops a redirect_to that isn't on its allow list (falling back to
 * the Site URL), and query strings rarely match the list exactly.
 */
export const OAUTH_INTENT_COOKIE = "trialent_oauth_intent";
export const OAUTH_INTENT_MAX_AGE_SECONDS = 600;

/** Where each role manages its account. Admins are managed by hand. */
export const SETTINGS_BY_ROLE: Record<UserRole, string | null> = {
  candidate: "/candidate/settings",
  company: "/company/settings",
  admin: null,
};

export function settingsFor(role: UserRole): string | null {
  return SETTINGS_BY_ROLE[role] ?? null;
}

/**
 * Before a candidate is selected, the company may hide, re-publish or withdraw
 * its project (enforced by guard_project_status). After that, it can't.
 */
export const COMPANY_MANAGEABLE_PROJECT_STATUSES = [
  "draft",
  "published",
  "applications_open",
] as const satisfies readonly ProjectStatus[];

/** Most candidates a hiring project can select. */
export const MAX_OPENINGS = 10;

export const PROJECT_PURPOSES = {
  hire: {
    label: "Hire",
    description:
      "You're recruiting. Select up to your number of openings; the project keeps taking applications until they're filled.",
  },
  build: {
    label: "Build only",
    description:
      "You want the work done, not a hire. One candidate builds it; applications close when you select them.",
  },
} as const;

/**
 * A selected candidate's work is finished once it reaches one of these.
 * "completed" means the work was accepted; "not_accepted" that it was rejected.
 */
export const CLOSED_WORK_STATUSES = [
  "completed",
  "not_accepted",
  "cancelled",
] as const satisfies readonly SelectionWorkStatus[];

/** A selected candidate can (re)submit in these states. */
export const SUBMITTABLE_WORK_STATUSES = [
  "in_progress",
  "revision_requested",
] as const satisfies readonly SelectionWorkStatus[];

/** Browse sections, in display order. */
export const PROJECT_CATEGORIES = {
  full_stack: {
    label: "Full-stack apps",
    blurb: "End-to-end products: UI, API and database.",
  },
  frontend: {
    label: "Frontend and web UI",
    blurb: "Interfaces, components and web experiences.",
  },
  backend: {
    label: "Backend and APIs",
    blurb: "Services, APIs, integrations and data models.",
  },
  mobile: { label: "Mobile apps", blurb: "Android, iOS and cross-platform apps." },
  ai_ml: {
    label: "AI and machine learning",
    blurb: "Models, LLM features and intelligent tools.",
  },
  data: { label: "Data and analytics", blurb: "Pipelines, dashboards and analysis." },
  devops: { label: "DevOps and cloud", blurb: "Infrastructure, CI/CD and reliability." },
  design: { label: "UI/UX design", blurb: "Research, flows and visual design." },
  other: { label: "Other projects", blurb: "Everything else startups need built." },
} as const satisfies Record<ProjectCategory, { label: string; blurb: string }>;

export const COMPANY_WORK_STYLES = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
} as const satisfies Record<CompanyWorkStyle, string>;

/**
 * What a company must fill in before it can post (mirrors the database's
 * company_ready_to_post): enough for a candidate to judge who they'd work for.
 */
export const COMPANY_SETUP_MIN_DESCRIPTION = 80;

/**
 * Where each signed-in role lands from "/" and the logo: their own dashboard.
 * Visitors get the landing page.
 */
export function homeFor(role: UserRole | null | undefined): string {
  return role ? dashboardFor(role) : "/";
}
