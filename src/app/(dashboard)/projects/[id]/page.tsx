import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"

import {
  getAggregatedProjectAllocations,
  getProjectAllocations,
} from "@/actions/allocation.actions"
import { getEmployeeOptions } from "@/actions/employee.actions"
import { getGradeCriteria } from "@/actions/grade.actions"
import { getMasterProjectOptions, getProjectDetail } from "@/actions/project.actions"
import { getProjectAssignments } from "@/actions/project-assignment.actions"
import { AggregatedAllocationMatrix } from "@/components/projects/aggregated-allocation-matrix"
import { AllocationMatrix } from "@/components/projects/allocation-matrix"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { DeleteProjectButton } from "@/components/projects/delete-project-button"
import { ProjectAssignmentList } from "@/components/projects/project-assignment-list"
import { ProjectBasicInfoForm } from "@/components/projects/project-basic-info-form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isManagerOrAbove } from "@/lib/auth-utils"

const VALID_TABS = ["basic", "allocations", "all-allocations", "subprojects"]

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const initialTab = tab && VALID_TABS.includes(tab) ? tab : "basic"

  const [project, canEdit, allocations, masterProjects, assignments] = await Promise.all([
    getProjectDetail(id),
    isManagerOrAbove(),
    getProjectAllocations(id),
    getMasterProjectOptions(),
    getProjectAssignments(id),
  ])

  if (!project) {
    notFound()
  }

  const employeeOptions = canEdit ? await getEmployeeOptions() : []
  const gradeCriteria = canEdit ? await getGradeCriteria() : []
  const gradeOptions = gradeCriteria.map((g) => g.gradeName)
  const isMasterProject = !project.parentProjectId
  const hasSubProjects = project.subProjects.length > 0
  const subProjectsMm = project.subProjects.reduce(
    (sum, sub) => sum + (sub.totalContractMm ?? 0),
    0
  )
  const aggregatedAllocations =
    isMasterProject && hasSubProjects
      ? await getAggregatedProjectAllocations([
          project.id,
          ...project.subProjects.map((sub) => sub.id),
        ])
      : []

  /** 계약 공수와 나란히 볼 수 있는 등급별 누적 투입 공수(연도 무관, 이 프로젝트 자신만). */
  const gradeSummary = new Map<string, number>()
  for (const allocation of allocations) {
    const grade = allocation.employee.grade?.currentGrade ?? "등급 미상"
    gradeSummary.set(
      grade,
      Math.round(((gradeSummary.get(grade) ?? 0) + allocation.inputMm) * 100) / 100
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/projects"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 프로젝트 목록
        </Link>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {project.projectCode ?? "코드 없음"} · {project.clientName}
          {project.parentProject && (
            <>
              {" · 상위 프로젝트: "}
              <Link
                href={`/projects/${project.parentProject.id}`}
                className="underline hover:no-underline"
              >
                {project.parentProject.name}
              </Link>
            </>
          )}
        </p>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          {isMasterProject && hasSubProjects && (
            <TabsTrigger value="all-allocations">전체 투입 인원</TabsTrigger>
          )}
          <TabsTrigger value="allocations">투입 인원 관리</TabsTrigger>
          {isMasterProject && (
            <TabsTrigger value="subprojects">
              하위 프로젝트 ({project.subProjects.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="basic" className="pt-4">
          {canEdit ? (
            <div className="flex max-w-md flex-col gap-6">
              <ProjectBasicInfoForm
                project={project}
                masterProjects={masterProjects}
                hasSubProjects={hasSubProjects}
              />
              {gradeSummary.size > 0 && (
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">등급별 투입 공수</dt>
                  <dd>
                    {Array.from(gradeSummary.entries())
                      .map(([grade, mm]) => `${grade} ${mm}MM`)
                      .join(" · ")}
                  </dd>
                </dl>
              )}
              <div className="border-t pt-4">
                <DeleteProjectButton
                  projectId={project.id}
                  projectName={project.name}
                />
              </div>
            </div>
          ) : (
            <dl className="grid max-w-md grid-cols-2 gap-y-3 text-sm">
              <dt className="text-muted-foreground">프로젝트 코드</dt>
              <dd>{project.projectCode ?? "-"}</dd>
              <dt className="text-muted-foreground">프로젝트명</dt>
              <dd>{project.name}</dd>
              <dt className="text-muted-foreground">발주처</dt>
              <dd>{project.clientName}</dd>
              <dt className="text-muted-foreground">근무지</dt>
              <dd>{project.location || "-"}</dd>
              <dt className="text-muted-foreground">시작일</dt>
              <dd>{format(project.startDate, "yyyy-MM-dd")}</dd>
              <dt className="text-muted-foreground">종료일</dt>
              <dd>
                {project.endDate ? format(project.endDate, "yyyy-MM-dd") : "-"}
              </dd>
              <dt className="text-muted-foreground">계약 공수(MM)</dt>
              <dd>{project.totalContractMm ?? "-"}</dd>
              <dt className="text-muted-foreground">등급별 투입 공수</dt>
              <dd>
                {gradeSummary.size > 0
                  ? Array.from(gradeSummary.entries())
                      .map(([grade, mm]) => `${grade} ${mm}MM`)
                      .join(" · ")
                  : "-"}
              </dd>
              <dt className="text-muted-foreground">상위 프로젝트</dt>
              <dd>{project.parentProject?.name ?? "-"}</dd>
            </dl>
          )}
        </TabsContent>

        <TabsContent value="allocations" className="flex flex-col gap-6 pt-4">
          <ProjectAssignmentList
            projectId={id}
            projectName={project.name}
            employees={employeeOptions}
            gradeOptions={gradeOptions}
            assignments={assignments.map((a) => ({
              id: a.id,
              employeeId: a.employeeId,
              employeeName: a.employee?.name ?? null,
              employeeGrade: a.employee?.grade?.currentGrade ?? null,
              placeholderLabel: a.placeholderLabel,
              placeholderGrade: a.placeholderGrade,
              projectId: id,
              projectName: project.name,
              periods: a.periods.map((p) => ({
                id: p.id,
                startDate: format(p.startDate, "yyyy-MM-dd"),
                endDate: p.endDate ? format(p.endDate, "yyyy-MM-dd") : null,
              })),
              monthlyMm: a.monthlyMm,
            }))}
            canEdit={canEdit}
          />
          <AllocationMatrix
            projectId={id}
            employees={employeeOptions}
            allocations={allocations}
            canEdit={canEdit}
          />
        </TabsContent>

        {isMasterProject && hasSubProjects && (
          <TabsContent value="all-allocations" className="flex flex-col gap-4 pt-4">
            <p className="text-sm text-muted-foreground">
              이 프로젝트와 하위 프로젝트 {project.subProjects.length}건의 투입 인원을
              합쳐 보여줍니다(조회 전용). 수정하려면 셀을 클릭해 해당 프로젝트의
              "투입 인원 관리"로 이동하세요.
            </p>
            <AggregatedAllocationMatrix allocations={aggregatedAllocations} />
          </TabsContent>
        )}

        {isMasterProject && (
          <TabsContent value="subprojects" className="pt-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  하위 프로젝트 {project.subProjects.length}건 · 하위 계약
                  공수 합계 {subProjectsMm}MM
                  {" / "}
                  전체 계약 공수 {project.totalContractMm ?? "-"}MM
                </p>
                {canEdit && (
                  <CreateProjectDialog
                    lockedParent={{ id: project.id, name: project.name }}
                  />
                )}
              </div>

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
                    {project.subProjects.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          등록된 하위 프로젝트가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      project.subProjects.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/projects/${sub.id}`}
                              className="hover:underline"
                            >
                              {sub.projectCode ?? "-"}
                            </Link>
                          </TableCell>
                          <TableCell>{sub.name}</TableCell>
                          <TableCell>{sub.clientName}</TableCell>
                          <TableCell>
                            {format(sub.startDate, "yyyy-MM-dd")}
                          </TableCell>
                          <TableCell>
                            {sub.endDate ? format(sub.endDate, "yyyy-MM-dd") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {sub.totalContractMm ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
