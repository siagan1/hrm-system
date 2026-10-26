"use client"

import { useActionState, useState } from "react"

import {
  updateEmployeeBasic,
  type UpdateEmployeeBasicState,
} from "@/actions/employee.actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { EMP_TYPE_OPTIONS } from "@/lib/employee-constants"

const initialState: UpdateEmployeeBasicState = {}

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return ""
  return date.toISOString().slice(0, 10)
}

type EditableEmployee = {
  id: string
  name: string
  empType: string
  joinDate: Date
  resignDate: Date | null
  contractEndDate: Date | null
  plannedActiveUntil: Date | null
  regularConversionDate: Date | null
  isExecutive: boolean
}

export function BasicInfoForm({ employee }: { employee: EditableEmployee }) {
  const [state, formAction, isPending] = useActionState(
    updateEmployeeBasic,
    initialState
  )
  const formKey = useFormRemountKey(state)
  const [isExecutive, setIsExecutive] = useState(employee.isExecutive)

  return (
    <form key={formKey} action={formAction} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="employeeId" value={employee.id} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">이름</Label>
        <Input
          id="name"
          name="name"
          defaultValue={state.values?.name ?? employee.name}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="empType">구분</Label>
        <Select
          name="empType"
          defaultValue={state.values?.empType ?? employee.empType}
          required
        >
          <SelectTrigger id="empType" className="w-full">
            <SelectValue placeholder="구분 선택" />
          </SelectTrigger>
          <SelectContent>
            {EMP_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="joinDate">입사일</Label>
        <Input
          id="joinDate"
          name="joinDate"
          type="date"
          defaultValue={
            state.values?.joinDate ?? toDateInputValue(employee.joinDate)
          }
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="resignDate">퇴사일</Label>
        <Input
          id="resignDate"
          name="resignDate"
          type="date"
          defaultValue={
            state.values?.resignDate ?? toDateInputValue(employee.resignDate)
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contractEndDate">계약 종료일</Label>
        <Input
          id="contractEndDate"
          name="contractEndDate"
          type="date"
          defaultValue={
            state.values?.contractEndDate ??
            toDateInputValue(employee.contractEndDate)
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="plannedActiveUntil">계획용 가용 종료일</Label>
        <Input
          id="plannedActiveUntil"
          name="plannedActiveUntil"
          type="date"
          defaultValue={
            state.values?.plannedActiveUntil ??
            toDateInputValue(employee.plannedActiveUntil)
          }
        />
        <p className="text-xs text-muted-foreground">
          계약 종료일이 지난 뒤에도 계약 연장/전환을 전제로 이 날짜까지는 가동률
          &quot;계획&quot; 모드에서 가용 인력으로 계산합니다. 실제 계약/퇴사 처리는
          계약 종료일·퇴사일로 하세요 — 이 값은 계획 모드 계산에만 쓰입니다.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="regularConversionDate">정규직 전환일</Label>
        <Input
          id="regularConversionDate"
          name="regularConversionDate"
          type="date"
          defaultValue={
            state.values?.regularConversionDate ??
            toDateInputValue(employee.regularConversionDate)
          }
        />
        <p className="text-xs text-muted-foreground">
          계약직 직원의 정규직 전환 예정일을 입력해두면, 해당 날짜가
          지나는 시점부터 구분이 자동으로 정규직으로 바뀝니다.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <input type="hidden" name="isExecutive" value={isExecutive ? "true" : ""} />
        <div className="flex items-center gap-2">
          <Checkbox
            id="isExecutive"
            checked={isExecutive}
            onCheckedChange={(checked) => setIsExecutive(checked === true)}
          />
          <Label htmlFor="isExecutive" className="font-normal">
            임원 (조직도 밖에서 관리 — 예: CEO)
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          켜면 가동률 집계 제외 대상으로도 같이 설정되고, 등급 분포·등급 상승 알림 등
          등급 관련 집계에서도 제외됩니다. 소속 팀도 비워둘 수 있습니다.
        </p>
      </div>

      {state.error && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-emerald-600">
          저장되었습니다.
        </p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  )
}
