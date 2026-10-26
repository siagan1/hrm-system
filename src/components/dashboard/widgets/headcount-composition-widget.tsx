import { getDashboardHeadcountComposition } from "@/actions/dashboard.actions"
import { HeadcountCompositionChart } from "@/components/dashboard/widgets/headcount-composition-chart"

export async function HeadcountCompositionWidget() {
  const months = await getDashboardHeadcountComposition()
  const currentMonthIndex = new Date().getMonth()

  // 연평균 비율 = 1~12월 정규직(계약직) 인원 합 ÷ 1~12월 전체 인원 합.
  // 가동률 추이 위젯의 연평균과 같은 방식(월별 비율의 평균이 아니라 연간 합계 기준)입니다.
  const regularSum = months.reduce((s, m) => s + m.regularCount, 0)
  const totalSum = months.reduce((s, m) => s + m.regularCount + m.contractCount, 0)
  const regularRatio = totalSum > 0 ? Math.round((regularSum / totalSum) * 100) : null

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">월별 인원 구성</h2>
        {regularRatio !== null && (
          <span className="text-xs text-muted-foreground">
            연평균 정규직{" "}
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {regularRatio}%
            </span>
            {" · "}계약직{" "}
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {100 - regularRatio}%
            </span>
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <HeadcountCompositionChart months={months} currentMonthIndex={currentMonthIndex} />
      </div>
    </div>
  )
}
