import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"

import { getCertifications } from "@/actions/certification.actions"
import { getEmployeeBasic } from "@/actions/employee.actions"
import { getGradeOptions } from "@/actions/grade-option.actions"
import {
  getEmployeeGrade,
  getEmployeeGradeProfile,
  getGradeCriteria,
} from "@/actions/grade.actions"
import { getLpRecords } from "@/actions/lp-record.actions"
import { getProjectOptions } from "@/actions/project.actions"
import {
  getEmployeeAssignmentMatrix,
  getEmployeeAssignments,
} from "@/actions/project-assignment.actions"
import { getUtilizationExclusion } from "@/actions/utilization-exclusion.actions"
import { AddUtilizationOverrideDialog } from "@/components/employees/add-utilization-override-dialog"
import { BasicInfoForm } from "@/components/employees/basic-info-form"
import { CertificationDialog } from "@/components/employees/certification-dialog"
import { DeleteCertificationButton } from "@/components/employees/delete-certification-button"
import { DeleteEmployeeButton } from "@/components/employees/delete-employee-button"
import { DeleteUtilizationOverrideButton } from "@/components/employees/delete-utilization-override-button"
import { EmployeeAssignmentList } from "@/components/employees/employee-assignment-list"
import { EmployeeAssignmentMatrix } from "@/components/employees/employee-assignment-matrix"
import { EmployeeAssignmentYearFilter } from "@/components/employees/employee-assignment-year-filter"
import { GradeForm } from "@/components/employees/grade-form"
import { GradeProfileForm } from "@/components/employees/grade-profile-form"
import { LpRecordDialog } from "@/components/employees/lp-record-dialog"
import { UtilizationDefaultSelect } from "@/components/employees/utilization-default-select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isAdmin, isManagerOrAbove } from "@/lib/auth-utils"
import { EMP_TYPE_LABEL } from "@/lib/employee-constants"

function AccessDenied() {
  return (
    <p className="text-sm text-muted-foreground">
      이 탭을 볼 권한이 없습니다. (ADMIN, MANAGER 전용)
    </p>
  )
}

const VALID_TABS = [
  "basic",
  "history",
  "grade",
  "certifications",
  "lp",
  "utilization",
  "assignments",
]

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; year?: string }>
}) {
  const { id } = await params
  const { tab, year } = await searchParams
  const initialTab = tab && VALID_TABS.includes(tab) ? tab : "basic"
  const targetYear = year ?? String(new Date().getFullYear())

  const [employee, canEdit, canViewSensitive, projectOptions, assignments, assignmentMatrix] =
    await Promise.all([
      getEmployeeBasic(id),
      isAdmin(),
      isManagerOrAbove(),
      getProjectOptions(),
      getEmployeeAssignments(id),
      getEmployeeAssignmentMatrix(id, targetYear),
    ])

  if (!employee) {
    notFound()
  }

  const [
    grade,
    gradeCriteria,
    gradeProfile,
    gradeOptions,
    lpRecords,
    utilizationExclusion,
    certifications,
  ] = canViewSensitive
    ? await Promise.all([
        getEmployeeGrade(id),
        getGradeCriteria(),
        getEmployeeGradeProfile(id),
        getGradeOptions(),
        getLpRecords(id),
        getUtilizationExclusion(id),
        getCertifications(id),
      ])
    : [null, [], null, [], [], { excludedFromUtilization: false, overrides: [] }, []]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/employees"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 직원 목록
        </Link>
        <h1 className="text-2xl font-semibold">{employee.name}</h1>
        <p className="text-sm text-muted-foreground">
          {employee.user?.email ?? "로그인 계정 없음"}
        </p>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          <TabsTrigger value="assignments">투입 프로젝트</TabsTrigger>
          <TabsTrigger value="history">조직 이력</TabsTrigger>
          <TabsTrigger value="grade">등급 관리</TabsTrigger>
          <TabsTrigger value="certifications">자격증</TabsTrigger>
          <TabsTrigger value="lp">LP 관리</TabsTrigger>
          <TabsTrigger value="utilization">가동률 설정</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="pt-4">
          {canEdit ? (
            <div className="flex max-w-md flex-col gap-6">
              <BasicInfoForm employee={employee} />
              <div className="border-t pt-4">
                <DeleteEmployeeButton employeeId={id} employeeName={employee.name} />
              </div>
            </div>
          ) : (
            <dl className="grid max-w-md grid-cols-2 gap-y-3 text-sm">
              <dt className="text-muted-foreground">이름</dt>
              <dd>{employee.name}</dd>
              <dt className="text-muted-foreground">구분</dt>
              <dd>{EMP_TYPE_LABEL[employee.empType] ?? employee.empType}</dd>
              <dt className="text-muted-foreground">입사일</dt>
              <dd>{format(employee.joinDate, "yyyy-MM-dd")}</dd>
              <dt className="text-muted-foreground">퇴사일</dt>
              <dd>
                {employee.resignDate
                  ? format(employee.resignDate, "yyyy-MM-dd")
                  : "-"}
              </dd>
              <dt className="text-muted-foreground">계약 종료일</dt>
              <dd>
                {employee.contractEndDate
                  ? format(employee.contractEndDate, "yyyy-MM-dd")
                  : "-"}
              </dd>
              <dt className="text-muted-foreground">정규직 전환일</dt>
              <dd>
                {employee.regularConversionDate
                  ? format(employee.regularConversionDate, "yyyy-MM-dd")
                  : "-"}
              </dd>
              <dt className="text-muted-foreground">임원</dt>
              <dd>{employee.isExecutive ? "예 (조직도 밖)" : "-"}</dd>
            </dl>
          )}

          {canViewSensitive && gradeProfile && (
            <GradeProfileForm
              employeeId={id}
              profile={gradeProfile}
              options={gradeOptions}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>팀</TableHead>
                  <TableHead>시작일</TableHead>
                  <TableHead>종료일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.teamHistories.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      조직 이력이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  employee.teamHistories.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="font-medium">
                        {history.team.teamName}
                      </TableCell>
                      <TableCell>
                        {format(history.startDate, "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell>
                        {history.endDate ? (
                          format(history.endDate, "yyyy-MM-dd")
                        ) : (
                          <Badge variant="secondary">현재</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="grade" className="pt-4">
          {canViewSensitive ? (
            <GradeForm employeeId={id} employee={employee} grade={grade} criteria={gradeCriteria} />
          ) : (
            <AccessDenied />
          )}
        </TabsContent>

        <TabsContent value="certifications" className="pt-4">
          {canViewSensitive ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <CertificationDialog employeeId={id} />
              </div>
              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>자격증명</TableHead>
                      <TableHead>취득일</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certifications.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="h-24 text-center text-muted-foreground"
                        >
                          등록된 자격증이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      certifications.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell className="font-medium">{cert.name}</TableCell>
                          <TableCell>
                            {format(cert.acquiredDate, "yyyy-MM-dd")}
                          </TableCell>
                          <TableCell>
                            <DeleteCertificationButton
                              certificationId={cert.id}
                              employeeId={id}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <AccessDenied />
          )}
        </TabsContent>

        <TabsContent value="lp" className="pt-4">
          {canViewSensitive ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <LpRecordDialog employeeId={id} />
              </div>
              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>지정 사유</TableHead>
                      <TableHead>향후 조치 계획</TableHead>
                      <TableHead>등록자</TableHead>
                      <TableHead>등록일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lpRecords.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          등록된 LP 이력이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      lpRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="max-w-xs whitespace-pre-wrap">
                            {record.reason}
                          </TableCell>
                          <TableCell className="max-w-xs whitespace-pre-wrap">
                            {record.actionPlan}
                          </TableCell>
                          <TableCell>
                            {record.registeredByEmail ?? "-"}
                          </TableCell>
                          <TableCell>
                            {format(record.createdAt, "yyyy-MM-dd")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <AccessDenied />
          )}
        </TabsContent>

        <TabsContent value="utilization" className="pt-4">
          {canViewSensitive ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">기본 상태</p>
                {canEdit ? (
                  <UtilizationDefaultSelect
                    employeeId={id}
                    excludedFromUtilization={utilizationExclusion.excludedFromUtilization}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {utilizationExclusion.excludedFromUtilization
                      ? "가동률 제외 대상 (기본)"
                      : "가동률 집계 대상 (기본)"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  대표/사업전략팀장처럼 평소 실무를 하지 않아 가동률 집계에서 빼야 하는
                  인원은 &quot;가동률 제외 대상&quot;으로 설정하세요. 아래 예외 기간으로
                  특정 기간만 기본 상태와 반대로(예: 일시적으로 프로젝트 투입, 휴직 등)
                  지정할 수 있습니다.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">예외 기간</p>
                {canEdit && (
                  <AddUtilizationOverrideDialog
                    employeeId={id}
                    excludedFromUtilization={utilizationExclusion.excludedFromUtilization}
                  />
                )}
              </div>

              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>구분</TableHead>
                      <TableHead>시작일</TableHead>
                      <TableHead>종료일</TableHead>
                      <TableHead>사유</TableHead>
                      {canEdit && <TableHead className="text-right">관리</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utilizationExclusion.overrides.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={canEdit ? 5 : 4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          등록된 예외 기간이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      utilizationExclusion.overrides.map((override) => (
                        <TableRow key={override.id}>
                          <TableCell>
                            <Badge
                              variant={
                                override.mode === "INCLUDE" ? "secondary" : "destructive"
                              }
                            >
                              {override.mode === "INCLUDE" ? "포함" : "제외"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {override.startDate
                              ? format(override.startDate, "yyyy-MM-dd")
                              : "처음부터"}
                          </TableCell>
                          <TableCell>
                            {override.endDate
                              ? format(override.endDate, "yyyy-MM-dd")
                              : "계속"}
                          </TableCell>
                          <TableCell className="max-w-xs whitespace-pre-wrap">
                            {override.reason || "-"}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <DeleteUtilizationOverrideButton
                                overrideId={override.id}
                                employeeId={id}
                              />
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <AccessDenied />
          )}
        </TabsContent>

        <TabsContent value="assignments" className="flex flex-col gap-6 pt-4">
          <EmployeeAssignmentList
            employeeId={id}
            employeeName={employee.name}
            projects={projectOptions}
            assignments={assignments.map((a) => ({
              id: a.id,
              employeeId: id,
              employeeName: employee.name,
              placeholderLabel: null,
              placeholderGrade: null,
              projectId: a.projectId,
              projectName: a.project.name,
              periods: a.periods.map((p) => ({
                id: p.id,
                startDate: format(p.startDate, "yyyy-MM-dd"),
                endDate: p.endDate ? format(p.endDate, "yyyy-MM-dd") : null,
              })),
              monthlyMm: a.monthlyMm,
            }))}
            canEdit={canViewSensitive}
          />

          <div className="flex items-center justify-between">
            <h3 className="font-medium">연간 투입 매트릭스</h3>
            <EmployeeAssignmentYearFilter employeeId={id} year={targetYear} />
          </div>
          <EmployeeAssignmentMatrix rows={assignmentMatrix} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
