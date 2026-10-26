import { redirect } from "next/navigation"

import { getGradeOptions } from "@/actions/grade-option.actions"
import { getGradeCriteria } from "@/actions/grade.actions"
import { GradeOptionsForm } from "@/components/grade-options/grade-options-form"
import { isAdmin } from "@/lib/auth-utils"

export default async function GradeOptionsPage() {
  const admin = await isAdmin()
  if (!admin) {
    redirect("/")
  }

  const [options, criteria] = await Promise.all([
    getGradeOptions(),
    getGradeCriteria(),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">등급 옵션 관리</h1>
        <p className="text-sm text-muted-foreground">
          직원 등급 산정에 쓰이는 학력·자격증별 인정개월수와, 등급(초급/중급/고급/특급)
          판정 기준 개월수입니다. 직원 기본정보에서 학력 1개, 자격증 1개(가장 높은 것)를
          선택하면 여기 설정된 개월수가 자동으로 반영됩니다.
        </p>
      </div>

      <GradeOptionsForm options={options} criteria={criteria} />
    </div>
  )
}
