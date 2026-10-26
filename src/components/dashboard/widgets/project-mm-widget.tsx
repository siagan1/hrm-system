import { getProjectMmSummary } from "@/actions/dashboard.actions"
import { ProjectMmChart } from "@/components/dashboard/widgets/project-mm-chart"

export async function ProjectMmWidget() {
  const data = await getProjectMmSummary()

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="font-semibold">프로젝트별 MM 현황</h2>
      {data.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          등록된 프로젝트가 없습니다.
        </p>
      ) : (
        <div className="min-h-0 flex-1">
          <ProjectMmChart data={data} />
        </div>
      )}
    </div>
  )
}
