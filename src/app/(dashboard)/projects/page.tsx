import Link from "next/link"
import { format } from "date-fns"

import { getMasterProjectOptions, getProjects } from "@/actions/project.actions"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ExportProjectsDialog } from "@/components/projects/export-projects-dialog"
import { ProjectPeriodFilter } from "@/components/projects/project-period-filter"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isManagerOrAbove } from "@/lib/auth-utils"
import { cn } from "@/lib/utils"

type ProjectListItem = Awaited<ReturnType<typeof getProjects>>[number]

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** 프로젝트의 기간(시작일~종료일, 종료일 없으면 진행중)이 [periodStart, periodEnd]와 겹치는지 확인합니다. */
function overlapsPeriod(
  project: Pick<ProjectListItem, "startDate" | "endDate">,
  periodStart: Date,
  periodEnd: Date
): boolean {
  if (project.startDate > periodEnd) return false
  if (project.endDate && project.endDate < periodStart) return false
  return true
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; year?: string; start?: string; end?: string }>
}) {
  const params = await searchParams

  const mode: "year" | "range" = params.mode === "range" ? "range" : "year"
  const year = params.year ?? String(new Date().getFullYear())

  const periodStart =
    mode === "range" && params.start
      ? new Date(params.start)
      : new Date(Date.UTC(Number(year), 0, 1))
  const periodEnd =
    mode === "range" && params.end
      ? new Date(params.end)
      : new Date(Date.UTC(Number(year), 11, 31))

  const [projects, masterProjects, canCreate] = await Promise.all([
    getProjects(),
    getMasterProjectOptions(),
    isManagerOrAbove(),
  ])

  const filteredIds = new Set(
    projects
      .filter((p) => overlapsPeriod(p, periodStart, periodEnd))
      .map((p) => p.id)
  )
  const filteredProjects = projects.filter((p) => filteredIds.has(p.id))

  // 상위가 이번 조회 기간에 포함되지 않으면(=목록에 없으면) 하위를 최상위처럼 보여줍니다.
  const topLevelProjects = filteredProjects.filter(
    (p) => !p.parentProjectId || !filteredIds.has(p.parentProjectId)
  )
  const subProjectsByParentId = new Map<string, ProjectListItem[]>()
  for (const project of filteredProjects) {
    if (!project.parentProjectId || !filteredIds.has(project.parentProjectId)) continue
    const list = subProjectsByParentId.get(project.parentProjectId) ?? []
    list.push(project)
    subProjectsByParentId.set(project.parentProjectId, list)
  }

  const rows = topLevelProjects.flatMap((master) => [
    { project: master, isSub: false },
    ...(subProjectsByParentId.get(master.id) ?? []).map((sub) => ({
      project: sub,
      isSub: true,
    })),
  ])

  const periodLabel =
    mode === "year"
      ? `${year}년`
      : `${toDateInputValue(periodStart)} ~ ${toDateInputValue(periodEnd)}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">프로젝트 관리</h1>
          <p className="text-sm text-muted-foreground">
            {periodLabel} 기준 프로젝트 {rows.length}건 (상위 {topLevelProjects.length}건)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportProjectsDialog />
          {canCreate && <CreateProjectDialog masterProjects={masterProjects} />}
        </div>
      </div>

      <ProjectPeriodFilter
        mode={mode}
        year={year}
        periodStart={toDateInputValue(periodStart)}
        periodEnd={toDateInputValue(periodEnd)}
      />

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로젝트 코드</TableHead>
              <TableHead>프로젝트명</TableHead>
              <TableHead>발주처</TableHead>
              <TableHead>시작일</TableHead>
              <TableHead>종료일</TableHead>
              <TableHead className="text-right">계약 공수(MM)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  해당 기간에 프로젝트가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ project, isSub }) => (
                <TableRow key={project.id}>
                  <TableCell
                    className={cn(
                      "font-medium",
                      isSub && "pl-8 font-normal text-muted-foreground"
                    )}
                  >
                    {isSub && "↳ "}
                    <Link
                      href={`/projects/${project.id}`}
                      className="hover:underline"
                    >
                      {project.projectCode ?? "-"}
                    </Link>
                  </TableCell>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.clientName}</TableCell>
                  <TableCell>
                    {format(project.startDate, "yyyy-MM-dd")}
                  </TableCell>
                  <TableCell>
                    {project.endDate
                      ? format(project.endDate, "yyyy-MM-dd")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {project.totalContractMm ?? "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
