"use client"

import { useActionState } from "react"

import {
  updateEmployeeGradeProfile,
  type GradeProfileState,
} from "@/actions/grade.actions"
import { Button } from "@/components/ui/button"
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

const initialState: GradeProfileState = {}

/** Select의 "선택 안 함" 항목은 빈 문자열을 쓸 수 없어 사용하는 센티널 값. */
const NONE_VALUE = "__none__"

type GradeOption = {
  id: string
  category: "EDUCATION" | "CERTIFICATE"
  label: string
}

export function GradeProfileForm({
  employeeId,
  profile,
  options,
}: {
  employeeId: string
  profile: { eduOptionId: string | null; certOptionId: string | null; expMonths: number }
  options: GradeOption[]
}) {
  const [state, formAction, isPending] = useActionState(
    updateEmployeeGradeProfile,
    initialState
  )
  const formKey = useFormRemountKey(state)

  const eduOptions = options.filter((o) => o.category === "EDUCATION")
  const certOptions = options.filter((o) => o.category === "CERTIFICATE")

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex max-w-md flex-col gap-4 border-t pt-4"
    >
      <input type="hidden" name="employeeId" value={employeeId} />

      <div>
        <h3 className="text-sm font-medium">등급 산정 기초정보</h3>
        <p className="text-xs text-muted-foreground">
          학력·자격증은 각각 가장 높은 것 1개만 선택하세요.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="eduOptionId">학력</Label>
        <Select
          name="eduOptionId"
          defaultValue={state.values?.eduOptionId ?? profile.eduOptionId ?? NONE_VALUE}
        >
          <SelectTrigger id="eduOptionId" className="w-full">
            <SelectValue placeholder="선택 안 함" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
            {eduOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="certOptionId">자격증 (최고 등급 1개)</Label>
        <Select
          name="certOptionId"
          defaultValue={state.values?.certOptionId ?? profile.certOptionId ?? NONE_VALUE}
        >
          <SelectTrigger id="certOptionId" className="w-full">
            <SelectValue placeholder="선택 안 함" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
            {certOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="expMonths">타사 경력(개월)</Label>
        <Input
          id="expMonths"
          name="expMonths"
          type="number"
          min={0}
          defaultValue={state.values?.expMonths ?? profile.expMonths}
        />
        <p className="text-xs text-muted-foreground">
          우리회사 근속은 입사일 기준으로 자동 계산되어 별도로 더해지니, 여기에는 입사
          전 다른 회사 경력만 입력하세요.
        </p>
      </div>

      {state.error && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-emerald-600">저장되었습니다.</p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  )
}
