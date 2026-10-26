"use client"

import { useActionState } from "react"

import {
  updateGradeOptions,
  type GradeOptionState,
} from "@/actions/grade-option.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormRemountKey } from "@/hooks/use-form-remount-key"

const initialState: GradeOptionState = {}

type GradeOption = {
  id: string
  category: "EDUCATION" | "CERTIFICATE"
  label: string
  months: number
}

type GradeCriterion = {
  id: string
  gradeName: string
  requiredMonths: number
}

function OptionSection({
  title,
  description,
  options,
  values,
}: {
  title: string
  description: string
  options: GradeOption[]
  values?: Record<string, string>
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-3">
            <Label htmlFor={`months_${option.id}`} className="w-24 shrink-0">
              {option.label}
            </Label>
            <Input
              id={`months_${option.id}`}
              name={`months_${option.id}`}
              type="number"
              min={0}
              defaultValue={values?.[`months_${option.id}`] ?? option.months}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">개월</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GradeOptionsForm({
  options,
  criteria,
}: {
  options: GradeOption[]
  criteria: GradeCriterion[]
}) {
  const [state, formAction, isPending] = useActionState(
    updateGradeOptions,
    initialState
  )
  const formKey = useFormRemountKey(state)

  const eduOptions = options.filter((o) => o.category === "EDUCATION")
  const certOptions = options.filter((o) => o.category === "CERTIFICATE")

  return (
    <form key={formKey} action={formAction} className="flex max-w-md flex-col gap-6">
      <OptionSection
        title="학력"
        description="최종 학력 1개 기준으로 인정되는 개월수입니다."
        options={eduOptions}
        values={state.values}
      />
      <OptionSection
        title="자격증"
        description="보유 자격증 중 가장 높은 것 1개 기준으로 인정되는 개월수입니다."
        options={certOptions}
        values={state.values}
      />
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-medium">등급 기준</h2>
          <p className="text-sm text-muted-foreground">
            총 환산개월수가 이 값 이상이면 해당 등급으로 추천됩니다. 초급→특급 순으로
            커지거나 같아야 합니다.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {criteria.map((criterion) => (
            <div key={criterion.id} className="flex items-center gap-3">
              <Label
                htmlFor={`requiredMonths_${criterion.id}`}
                className="w-24 shrink-0"
              >
                {criterion.gradeName}
              </Label>
              <Input
                id={`requiredMonths_${criterion.id}`}
                name={`requiredMonths_${criterion.id}`}
                type="number"
                min={0}
                defaultValue={
                  state.values?.[`requiredMonths_${criterion.id}`] ??
                  criterion.requiredMonths
                }
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">개월 이상</span>
            </div>
          ))}
        </div>
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
