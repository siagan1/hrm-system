import { redirect } from "next/navigation"

import {
  getYearNonWorkingDays,
  getYearWorkingDaySummary,
} from "@/actions/working-day.actions"
import { WorkingDaysCalendar } from "@/components/working-days/working-days-calendar"
import { YearFilter } from "@/components/working-days/year-filter"
import { isAdmin } from "@/lib/auth-utils"

export default async function WorkingDaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const admin = await isAdmin()
  if (!admin) {
    redirect("/")
  }

  const { year } = await searchParams
  const targetYear = year ?? String(new Date().getFullYear())

  const [nonWorkingDays, monthlySummary] = await Promise.all([
    getYearNonWorkingDays(targetYear),
    getYearWorkingDaySummary(targetYear),
  ])
  const avgWorkingDays =
    Math.round((monthlySummary.reduce((sum, m) => sum + m.workingDays, 0) / 12) * 10) / 10

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">워킹데이 관리</h1>
        <p className="text-sm text-muted-foreground">
          프로젝트 투입 공수(MM) 계산의 기준이 되는 근무일 정보입니다. 주말은 자동으로
          제외되며, 평일 중 공휴일·창립기념일 등 쉬는 날을 달력에서 클릭해 제외하고 사유를
          남길 수 있습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <YearFilter year={targetYear} />
        <span className="text-sm text-muted-foreground">
          {targetYear}년 월 평균 근무일수{" "}
          <span className="font-medium text-foreground">{avgWorkingDays}일</span>
        </span>
      </div>

      <WorkingDaysCalendar year={targetYear} nonWorkingDays={nonWorkingDays} />
    </div>
  )
}
