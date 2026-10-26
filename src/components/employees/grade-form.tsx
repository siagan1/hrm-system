"use client"

import { useActionState, useMemo } from "react"
import { format } from "date-fns"

import {
  upsertEmployeeGrade,
  type UpsertGradeState,
} from "@/actions/grade.actions"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFormRemountKey } from "@/hooks/use-form-remount-key"
import { getEffectiveResignDate, getTenureMonths } from "@/lib/employee-constants"
import { computeGradeProjections, suggestGrade } from "@/lib/grade"

const initialState: UpsertGradeState = {}

type GradeCriterionItem = {
  id: string
  gradeName: string
  requiredMonths: number
}

type ExistingGrade = {
  eduMonths: number
  certMonths: number
  expMonths: number
  currentGrade: string
} | null

type EmployeeTenureInfo = {
  joinDate: Date
  empType: string
  resignDate: Date | null
  contractEndDate: Date | null
}

export function GradeForm({
  employeeId,
  employee,
  grade,
  criteria,
}: {
  employeeId: string
  employee: EmployeeTenureInfo
  grade: ExistingGrade
  criteria: GradeCriterionItem[]
}) {
  const eduMonths = grade?.eduMonths ?? 0
  const certMonths = grade?.certMonths ?? 0
  const expMonths = grade?.expMonths ?? 0
  const tenureMonths = getTenureMonths(employee)
  const totalMonths = tenureMonths + eduMonths + certMonths + expMonths
  const fixedMonths = eduMonths + certMonths + expMonths

  const isResigned = useMemo(() => {
    const effectiveResignDate = getEffectiveResignDate(employee)
    return !!effectiveResignDate && effectiveResignDate <= new Date()
  }, [employee])

  // 근속은 매달 자동으로 늘어나므로, 상위 등급 기준(요구 개월수)까지 근속이 몇 개월 더
  // 필요한지 역산해 예상 도달일을 보여줍니다. 학력/자격증/타사경력만으로 이미 충족했거나,
  // 퇴사해서 더 이상 근속이 늘지 않는 경우는 날짜 대신 안내 문구를 보여줍니다.
  const projections = useMemo(
    () =>
      computeGradeProjections(criteria, fixedMonths, tenureMonths, employee.joinDate, isResigned).map(
        (p) => ({
          ...p,
          label:
            p.status === "met"
              ? "이미 충족"
              : p.status === "resigned"
                ? "해당 없음(퇴사)"
                : `예상 도달일 ${format(p.projectedDate!, "yyyy-MM-dd")}`,
        })
      ),
    [criteria, fixedMonths, tenureMonths, isResigned, employee.joinDate]
  )

  // 저장된 등급이 없으면(최초 진입) 총 환산개월수 기준 추천 등급을 기본값으로 보여줍니다.
  const suggestedGrade = useMemo(
    () => suggestGrade(totalMonths, criteria),
    [totalMonths, criteria]
  )

  const [state, formAction, isPending] = useActionState(
    upsertEmployeeGrade,
    initialState
  )
  const selectKey = useFormRemountKey(state)

  const defaultGradeValue =
    state.values?.currentGrade ?? grade?.currentGrade ?? suggestedGrade ?? undefined

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="employeeId" value={employeeId} />

      <div className="grid grid-cols-4 gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">우리회사 근속</span>
          <span className="font-medium">{tenureMonths}개월</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">학력 환산</span>
          <span className="font-medium">{eduMonths}개월</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">자격증 환산</span>
          <span className="font-medium">{certMonths}개월</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">타사 경력</span>
          <span className="font-medium">{expMonths}개월</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        우리회사 근속은 입사일(퇴사자는 퇴사일) 기준으로 자동 계산됩니다. 학력/자격증/타사
        경력은 기본 정보 탭에서 입력합니다.
      </p>

      <div className="rounded-md border bg-muted/40 px-4 py-3">
        <span className="text-sm text-muted-foreground">총 환산 개월수</span>
        <p className="text-2xl font-semibold">{totalMonths}개월</p>
      </div>

      {projections.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-md border px-4 py-3">
          <span className="text-sm text-muted-foreground">등급 달성 예상</span>
          <dl className="flex flex-col gap-1 text-sm">
            {projections.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <dt>
                  {p.gradeName} ({p.requiredMonths}개월)
                </dt>
                <dd
                  className={
                    p.status === "met" ? "font-medium text-emerald-600" : "font-medium"
                  }
                >
                  {p.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="currentGrade" className="text-sm font-medium">
            등급
          </label>
          {!grade?.currentGrade && suggestedGrade && (
            <span className="text-xs text-muted-foreground">
              추천: {suggestedGrade} (기준 개월수 충족, 필요시 변경 가능)
            </span>
          )}
        </div>
        <Select
          key={selectKey}
          name="currentGrade"
          defaultValue={defaultGradeValue}
          required
        >
          <SelectTrigger id="currentGrade" className="w-full">
            <SelectValue placeholder="등급 선택" />
          </SelectTrigger>
          <SelectContent>
            {criteria.map((criterion) => (
              <SelectItem key={criterion.id} value={criterion.gradeName}>
                {criterion.gradeName} ({criterion.requiredMonths}개월 이상)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          {isPending ? "저장 중..." : "등급 저장"}
        </Button>
      </div>
    </form>
  )
}
