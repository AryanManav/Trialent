import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getCompanyIdForUser, getCompanyPipeline } from "@/lib/data/company";
import {
  PIPELINE_VIEWS,
  entryAssessment,
  pipelineStage,
  type PipelineView,
} from "@/lib/company";
import { Button } from "@/components/ui/button";
import { LinkTabs } from "@/components/ui/tabs";
import { FilterChips } from "@/components/ui/filter-chips";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PipelineList } from "@/components/company/pipeline-list";
import type { PipelineStage } from "@/lib/company";
import type { PipelineEntry } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

function inView(view: PipelineView, entry: PipelineEntry): boolean {
  const stages: readonly PipelineStage[] | null = PIPELINE_VIEWS[view].stages;
  return (
    stages === null ||
    stages.includes(
      pipelineStage(
        entry.applicationStatus,
        entry.workStatus,
        entry.opportunityType,
        entryAssessment(entry)
      )
    )
  );
}

/** Everyone who applied to any of the company's projects, by where they stand. */
export default async function CompanyCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; project?: string }>;
}) {
  const params = await searchParams;
  const view: PipelineView =
    params.view && params.view in PIPELINE_VIEWS
      ? (params.view as PipelineView)
      : "review";

  const user = await requireRole(["company", "admin"]);
  const companyId = await getCompanyIdForUser(user.id);
  const pipeline = companyId ? await getCompanyPipeline(companyId) : [];

  const projects = [
    ...new Map(pipeline.map((entry) => [entry.projectId, entry.projectTitle])),
  ];
  const project = projects.some(([id]) => id === params.project) ? params.project! : null;
  const scoped = project
    ? pipeline.filter((entry) => entry.projectId === project)
    : pipeline;
  const shown = scoped.filter((entry) => inView(view, entry));

  const href = (next: { view?: PipelineView; project?: string | null }) => {
    const url = new URLSearchParams();
    const v = next.view ?? view;
    const p = next.project === undefined ? project : next.project;
    if (v !== "review") url.set("view", v);
    if (p) url.set("project", p);
    const qs = url.toString();
    return qs ? `/company/candidates?${qs}` : "/company/candidates";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageHeader
          title="Applicants"
          description="Your hiring pipeline across every project — who applied, who's building, and whose work is waiting for you."
          actions={
            <Link href="/search?type=candidates">
              <Button variant="outline">
                <Search className="h-4 w-4" aria-hidden />
                Discover talent
              </Button>
            </Link>
          }
        />
        <LinkTabs
          label="Pipeline stage"
          active={view}
          tabs={(Object.keys(PIPELINE_VIEWS) as PipelineView[]).map((id) => ({
            id,
            label: PIPELINE_VIEWS[id].label,
            href: href({ view: id }),
            count: scoped.filter((entry) => inView(id, entry)).length,
          }))}
        />
      </div>

      {projects.length > 1 && (
        <FilterChips
          label="Filter by project"
          active={project ?? "all"}
          chips={[
            { id: "all", label: "All projects", href: href({ project: null }) },
            ...projects.map(([id, title]) => ({
              id,
              label: title,
              href: href({ project: id }),
            })),
          ]}
        />
      )}

      {pipeline.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates yet"
          description="Post a paid project and applicants appear here — then you evaluate their real work before deciding."
          actionText="Post a project"
          actionHref="/company/projects/create"
        />
      ) : shown.length === 0 ? (
        <EmptyState
          compact
          icon={Users}
          title={view === "review" ? "No applications waiting" : "Nobody here yet"}
          description={
            view === "review"
              ? "You're up to date. New applications appear here the moment they arrive."
              : "Candidates move here as your evaluations progress."
          }
        />
      ) : (
        <PipelineList
          entries={shown}
          detail={view === "evaluation" ? "deadline" : "applied"}
        />
      )}
    </div>
  );
}
