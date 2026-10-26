"use client"

import { useActionState, useEffect, useState } from "react"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import {
  createProjectAssignment,
  updateProjectAssignment,
  type ProjectAssignmentState,
} from "@/actions/project-assignment.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFormRemountKey } from "@/hooks/use-form-remount-key"

const initialState: ProjectAssignmentState = {}

type EmployeeOption = { id: string; name: string }
type ProjectOption = { id: string; name: string; projectCode: string | null }

export type ExistingAssignmentPeriod = {
  id: string
  startDate: string // "YYYY-MM-DD"
  endDate: string | null
}

export type ExistingAssignment = {
  id: string
  employeeId: string | null
  employeeName: string | null
  placeholderLabel: string | null
  placeholderGrade: string | null
  projectId: string
  projectName: string
  periods: ExistingAssignmentPeriod[]
  monthlyMm: number
}

type PeriodRow = { startDate: string; endDate: string }

function parsePeriodsValue(value: string | undefined): PeriodRow[] | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    return parsed.map((p) => ({ startDate: p.startDate ?? "", endDate: p.endDate ?? "" }))
  } catch {
    return null
  }
}

type Props =
  | {
      mode: "byProject"
      projectId: string
      projectName: string
      employees: EmployeeOption[]
      gradeOptions?: string[]
      assignment?: ExistingAssignment
      trigger?: React.ReactNode
    }
  | {
      mode: "byEmployee"
      employeeId: string
      employeeName: string
      projects: ProjectOption[]
      assignment?: ExistingAssignment
      trigger?: React.ReactNode
    }

export function ProjectAssignmentDialog(props: Props) {
  const { assignment, trigger } = props
  const isEdit = !!assignment
  const isEditingPlaceholder = isEdit && !assignment.employeeId
  const [open, setOpen] = useState(false)
  const [isPlaceholder, setIsPlaceholder] = useState(false)
  const action = isEdit ? updateProjectAssignment : createProjectAssignment
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formKey = useFormRemountKey(state)

  const [periods, setPeriods] = useState<PeriodRow[]>(
    () =>
      parsePeriodsValue(state.values?.periods) ??
      (assignment
        ? assignment.periods.map((p) => ({ startDate: p.startDate, endDate: p.endDate ?? "" }))
        : [{ startDate: "", endDate: "" }])
  )

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      toast.success(isEdit ? "배정이 수정되었습니다." : "배정이 등록되었습니다.")
    }
  }, [state, isEdit])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">배정 기간 추가</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "배정 기간 수정" : "배정 기간 추가"}</DialogTitle>
        </DialogHeader>

        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          {isEdit ? (
            <input type="hidden" name="id" value={assignment.id} />
          ) : props.mode === "byProject" ? (
            <input type="hidden" name="projectId" value={props.projectId} />
          ) : (
            <input type="hidden" name="employeeId" value={props.employeeId} />
          )}

          {!isEdit && props.mode === "byProject" && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={isPlaceholder ? "outline" : "default"}
                onClick={() => setIsPlaceholder(false)}
              >
                실제 직원
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isPlaceholder ? "default" : "outline"}
                onClick={() => setIsPlaceholder(true)}
              >
                채용 예정(가상 인력)
              </Button>
              <input type="hidden" name="isPlaceholder" value={isPlaceholder ? "on" : ""} />
            </div>
          )}

          {isEditingPlaceholder ? (
            <div className="flex flex-col gap-2">
              <Label>가상 인력</Label>
              <Input defaultValue={assignment.placeholderLabel ?? ""} disabled />
              <Input defaultValue={assignment.placeholderGrade ?? ""} disabled />
            </div>
          ) : !isEdit && props.mode === "byProject" && isPlaceholder ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="placeholderLabel">가상 인력 설명</Label>
                <Input
                  id="placeholderLabel"
                  name="placeholderLabel"
                  placeholder="예: 채용필요-백엔드"
                  defaultValue={state.values?.placeholderLabel}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="placeholderGrade">가상 인력 등급</Label>
                <Select
                  key={formKey}
                  name="placeholderGrade"
                  defaultValue={state.values?.placeholderGrade}
                  required
                >
                  <SelectTrigger id="placeholderGrade" className="w-full">
                    <SelectValue placeholder="등급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {(props.gradeOptions ?? []).map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="employeeId">직원</Label>
              {isEdit ? (
                <Input defaultValue={assignment.employeeName ?? ""} disabled />
              ) : props.mode === "byProject" ? (
                <Combobox
                  key={formKey}
                  name="employeeId"
                  defaultValue={state.values?.employeeId}
                  placeholder="직원 선택"
                  searchPlaceholder="이름 검색..."
                  emptyText="일치하는 직원이 없습니다."
                  options={props.employees.map((employee) => ({
                    value: employee.id,
                    label: employee.name,
                  }))}
                />
              ) : (
                <Input defaultValue={props.employeeName} disabled />
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="projectId">프로젝트</Label>
            {isEdit ? (
              <Input defaultValue={assignment.projectName} disabled />
            ) : props.mode === "byProject" ? (
              <Input defaultValue={props.projectName} disabled />
            ) : (
              <Combobox
                key={formKey}
                name="projectId"
                defaultValue={state.values?.projectId}
                placeholder="프로젝트 선택"
                searchPlaceholder="프로젝트명/코드 검색..."
                emptyText="일치하는 프로젝트가 없습니다."
                options={props.projects.map((project) => ({
                  value: project.id,
                  label: project.projectCode
                    ? `${project.projectCode} ${project.name}`
                    : project.name,
                }))}
              />
            )}
          </div>

          <input type="hidden" name="periods" value={JSON.stringify(periods)} />

          <div className="flex flex-col gap-2">
            <Label>배정 기간</Label>
            <p className="text-xs text-muted-foreground">
              같은 프로젝트를 하다가 잠깐 빠졌다 다시 투입되는 경우 기간을 여러 개
              추가하세요. 기간끼리는 겹칠 수 없습니다.
            </p>
            {periods.map((period, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div className="flex flex-col gap-1">
                  {index === 0 && (
                    <Label htmlFor={`period-start-${index}`} className="text-xs">
                      시작일
                    </Label>
                  )}
                  <Input
                    id={`period-start-${index}`}
                    type="date"
                    value={period.startDate}
                    onChange={(e) => {
                      const next = [...periods]
                      next[index] = { ...next[index], startDate: e.target.value }
                      setPeriods(next)
                    }}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  {index === 0 && (
                    <Label htmlFor={`period-end-${index}`} className="text-xs">
                      종료일(비우면 진행중)
                    </Label>
                  )}
                  <Input
                    id={`period-end-${index}`}
                    type="date"
                    value={period.endDate}
                    onChange={(e) => {
                      const next = [...periods]
                      next[index] = { ...next[index], endDate: e.target.value }
                      setPeriods(next)
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={periods.length <= 1}
                  onClick={() => setPeriods(periods.filter((_, i) => i !== index))}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setPeriods([...periods, { startDate: "", endDate: "" }])}
            >
              <IconPlus className="size-4" />
              기간 추가
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="monthlyMm">월 투입 비율(MM)</Label>
            <Input
              id="monthlyMm"
              name="monthlyMm"
              type="number"
              min={0}
              max={2}
              step="0.01"
              defaultValue={state.values?.monthlyMm ?? assignment?.monthlyMm ?? 1}
              required
            />
            <p className="text-xs text-muted-foreground">
              기간에 해당하는 달마다 이 비율로 자동 채워집니다(1.0 = 풀타임). 월 중간에
              시작/종료되는 달은 일할 계산됩니다. 계약상 딱 떨어지는 값과 다르면 저장 후
              투입 인원 매트릭스에서 그 달만 직접 수정하세요 — 이후 배정 기간을 바꿔도 그
              달은 자동으로 덮어써지지 않습니다.
            </p>
          </div>

          {state.error && (
            <p className="text-sm font-medium text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
