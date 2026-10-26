import { getDashboardUtilizationTrend } from "@/actions/dashboard.actions"
import { UtilizationTrendChart } from "@/components/dashboard/widgets/utilization-trend-chart"
import { cn } from "@/lib/utils"

export async function UtilizationTrendWidget() {
  const trend = await getDashboardUtilizationTrend()
  const belowTarget =
    trend.yearlyRate !== null && trend.targetRate !== null && trend.yearlyRate < trend.targetRate

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">가동률 추이 ({trend.year}년)</h2>
        <div className="flex items-baseline gap-3">
          {trend.yearlyRate !== null && (
            <span className="text-xs text-muted-foreground">
              연평균{" "}
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums text-foreground",
                  belowTarget && "text-destructive"
                )}
              >
                {Math.round(trend.yearlyRate * 100)}%
              </span>
            </span>
          )}
          {trend.targetRate !== null && (
            <span className="text-xs text-muted-foreground">
              목표 {Math.round(trend.targetRate * 100)}%
            </span>
          )}
        </div>
      </div>
      {trend.targetRate === null && (
        <p className="text-xs text-muted-foreground">
          알림 설정에서 {trend.year}년 목표 가동률을 등록하면 미달 월이 강조 표시됩니다.
        </p>
      )}
      <div className="min-h-0 flex-1">
        <UtilizationTrendChart
          points={trend.points}
          targetRate={trend.targetRate}
          currentMonthIndex={trend.currentMonthIndex}
        />
      </div>
    </div>
  )
}
