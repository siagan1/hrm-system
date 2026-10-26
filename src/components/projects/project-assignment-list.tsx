"use client"

import { toast } from "sonner"

import { deleteProjectAssignment } from "@/actions/project-assignment.actions"
import { ProjectAssignmentDialog } from "@/components/projects/project-assignment-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type EmployeeOption = { id: string; name: string }

type AssignmentPeriod = { id: string; startDate: string; endDate: string | null }

type Assignment = {
  id: string
  employeeId: string | null
  employeeName: string | null
  employeeGrade: string | null
  placeholderLabel: string | null
  placeholderGrade: string | null
  projectId: string
  projectName: string
  periods: AssignmentPeriod[]
  monthlyMm: number
}

function DeleteAssignmentButton({
  assignmentId,
  projectId,
}: {
  assignmentId: string
  projectId: string
}) {
  return (
    <ConfirmDeleteButton
      title="이 배정 기간을 삭제할까요?"
      description="자동 생성된(수동 수정 안 한) 월별 투입 데이터도 함께 삭제됩니다."
      onConfirm={async () => {
        await deleteProjectAssignment(assignmentId, projectId)
        toast.success("배정 기간이 삭제되었습니다.")
      }}
      trigger={
        <Button type="button" variant="ghost" size="sm">
          삭제
        </Button>
      }
    />
  )
}

export function ProjectAssignmentList({
  projectId,
  projectName,
  employees,
  gradeOptions,
  assignments,
  canEdit,
}: {
  projectId: string
  projectName: string
  employees: EmployeeOption[]
  gradeOptions?: string[]
  assignments: Assignment[]
  canEdit: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">배정 기간</h3>
          <p className="text-sm text-muted-foreground">
            "언제부터 언제까지 투입"을 등록하면 아래 매트릭스의 월별 셀이 자동으로 채워집니다.
          </p>
        </div>
        {canEdit && (
          <ProjectAssignmentDialog
            mode="byProject"
            projectId={projectId}
            projectName={projectName}
            employees={employees}
            gradeOptions={gradeOptions}
          />
        )}
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>직원</TableHead>
              <TableHead>시작일</TableHead>
              <TableHead>종료일</TableHead>
              <TableHead className="text-right">월 비율(MM)</TableHead>
              {canEdit && <TableHead className="text-right">관리</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 5 : 4}
                  className="h-20 text-center text-muted-foreground"
                >
                  등록된 배정 기간이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    {assignment.employeeId ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {assignment.employeeName}
                        {assignment.employeeGrade && (
                          <Badge variant="outline">{assignment.employeeGrade}</Badge>
                        )}
                      </span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {assignment.placeholderLabel}
                        {assignment.placeholderGrade && (
                          <Badge variant="outline">{assignment.placeholderGrade}</Badge>
                        )}
                        <Badge variant="secondary">가상</Badge>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {assignment.periods.map((period) => (
                        <span key={period.id}>{period.startDate}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {assignment.periods.map((period) => (
                        <span key={period.id}>
                          {period.endDate ?? <Badge variant="secondary">진행중</Badge>}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{assignment.monthlyMm}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <ProjectAssignmentDialog
                          mode="byProject"
                          projectId={projectId}
                          projectName={projectName}
                          employees={employees}
                          gradeOptions={gradeOptions}
                          assignment={assignment}
                          trigger={
                            <Button variant="outline" size="sm">
                              수정
                            </Button>
                          }
                        />
                        <DeleteAssignmentButton
                          assignmentId={assignment.id}
                          projectId={projectId}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
