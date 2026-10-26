import { getTeamUtilizationComparison } from "@/actions/dashboard.actions"
import { TeamUtilizationChart } from "@/components/dashboard/widgets/team-utilization-chart"

export async function TeamUtilizationWidget() {
  const teams = await getTeamUtilizationComparison()

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="font-semibold">팀별 가동률 비교</h2>
      {teams.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          데이터가 없습니다.
        </p>
      ) : (
        <div className="min-h-0 flex-1">
          <TeamUtilizationChart teams={teams} />
        </div>
      )}
    </div>
  )
}
