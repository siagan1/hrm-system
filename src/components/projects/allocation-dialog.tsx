"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  deleteAllocation,
  upsertAllocation,
  type AllocationState,
} from "@/actions/allocation.actions"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

const initialState: AllocationState = {}

type EmployeeOption = {
  id: string
  name: string
}

type ExistingAllocation = {
  id: string
  employeeId: string
  employeeName: string
  targetMonth: string
  inputMm: number
  isManualMm: boolean
}

export function AllocationDialog({
  projectId,
  employees,
  allocation,
  trigger,
  defaultEmployeeId,
  defaultEmployeeName,
  defaultTargetMonth,
}: {
  projectId: string
  employees: EmployeeOption[]
  allocation?: ExistingAllocation
  /** 매트릭스 셀처럼 기본 트리거 버튼 대신 쓸 커스텀 트리거 */
  trigger?: React.ReactNode
  /** 신규 등록 시 직원을 미리 고정하고 싶을 때 (매트릭스 빈 셀 클릭) */
  defaultEmployeeId?: string
  defaultEmployeeName?: string
  /** 신규 등록 시 대상 월을 미리 고정하고 싶을 때 (매트릭스 빈 셀 클릭) */
  defaultTargetMonth?: string
}) {
  const isEdit = !!allocation
  const lockEmployee = isEdit || !!defaultEmployeeId
  const lockMonth = isEdit || !!defaultTargetMonth
  const employeeIdValue = allocation?.employeeId ?? defaultEmployeeId
  const employeeNameValue = allocation?.employeeName ?? defaultEmployeeName
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"auto" | "manual">(
    allocation?.isManualMm ? "manual" : "auto"
  )
  const [state, formAction, isPending] = useActionState(
    upsertAllocation,
    initialState
  )
  const formKey = useFormRemountKey(state)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      toast.success("투입 정보가 저장되었습니다.")
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant={isEdit ? "outline" : "default"}
            size={isEdit ? "sm" : "default"}
          >
            {isEdit ? "수정" : "인원 투입"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "투입 정보 수정" : "인원 투입"}</DialogTitle>
        </DialogHeader>

        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="mode" value={mode} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="employeeId">직원</Label>
            {lockEmployee ? (
              <>
                <Input id="employeeId" defaultValue={employeeNameValue} disabled />
                <input type="hidden" name="employeeId" value={employeeIdValue} />
              </>
            ) : (
              <Select
                name="employeeId"
                defaultValue={state.values?.employeeId}
                required
              >
                <SelectTrigger id="employeeId" className="w-full">
                  <SelectValue placeholder="직원 선택" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="targetMonth">대상 월</Label>
            {(() => {
              const monthValue =
                state.values?.targetMonth ?? allocation?.targetMonth ?? defaultTargetMonth
              return lockMonth ? (
                <>
                  <Input id="targetMonth" type="month" defaultValue={monthValue} disabled />
                  <input type="hidden" name="targetMonth" value={monthValue} />
                </>
              ) : (
                <Input
                  id="targetMonth"
                  name="targetMonth"
                  type="month"
                  defaultValue={monthValue}
                  required
                />
              )
            })()}
          </div>

          <div className="flex flex-col gap-2">
            <Label>입력 방식</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "auto" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setMode("auto")}
              >
                자동 산출
              </Button>
              <Button
                type="button"
                variant={mode === "manual" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setMode("manual")}
              >
                수동 입력
              </Button>
            </div>
          </div>

          {/* 두 입력칸은 같은 위치의 같은 컴포넌트라 key가 없으면 React가 DOM을 재사용해,
              모드를 바꿔도 이전 칸의 값(예: 투입 MM 0.5)이 투입 일수로 넘어가 저장됩니다. */}
          {mode === "auto" ? (
            <div key="auto" className="flex flex-col gap-2">
              <Label htmlFor="inputDays">투입 일수</Label>
              <Input
                id="inputDays"
                name="inputDays"
                type="number"
                min={0}
                step="0.5"
                defaultValue={state.values?.inputDays}
              />
              <p className="text-xs text-muted-foreground">
                해당 월의 워킹데이 근무일수를 기준으로 MM이 자동 계산됩니다.
              </p>
            </div>
          ) : (
            <div key="manual" className="flex flex-col gap-2">
              <Label htmlFor="manualMm">투입 MM</Label>
              <Input
                id="manualMm"
                name="manualMm"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  state.values?.manualMm ?? (isEdit ? allocation.inputMm : undefined)
                }
              />
            </div>
          )}

          {state.error && (
            <p className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter className={isEdit ? "sm:justify-between" : undefined}>
            {isEdit && (
              <ConfirmDeleteButton
                title="이 투입 배정을 삭제할까요?"
                onConfirm={async () => {
                  await deleteAllocation(allocation.id, projectId)
                  setOpen(false)
                  toast.success("투입 배정이 삭제되었습니다.")
                }}
                trigger={
                  <Button type="button" variant="destructive">
                    삭제
                  </Button>
                }
              />
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
