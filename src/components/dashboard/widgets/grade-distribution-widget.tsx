import { getGradeDistribution } from "@/actions/dashboard.actions"
import { GradeDistributionChart } from "@/components/dashboard/widgets/grade-distribution-chart"

export async function GradeDistributionWidget() {
  const items = await getGradeDistribution()

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="font-semibold">등급 분포 현황</h2>
      {items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          데이터가 없습니다.
        </p>
      ) : (
        <div className="min-h-0 flex-1">
          <GradeDistributionChart items={items} />
        </div>
      )}
    </div>
  )
}
