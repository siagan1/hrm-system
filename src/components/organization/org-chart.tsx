import type { OrgChartData } from "@/actions/org.actions"
import { EditOrgUnitDialog } from "@/components/organization/edit-org-unit-dialog"

export function OrgChart({
  data,
  editable = false,
}: {
  data: OrgChartData
  /** 오늘 기준 조직도를 볼 때만 true — 과거 스냅샷은 이력이 바뀌면 안 되므로 수정 버튼을 숨깁니다. */
  editable?: boolean
}) {
  const isEmpty = data.groups.length === 0 && data.ungroupedTeams.length === 0

  if (isEmpty) {
    return (
      <div className="rounded-md border bg-background p-8 text-center text-sm text-muted-foreground">
        {data.asOf} 기준 등록된 조직이 없습니다.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border bg-background p-4">
      <p className="text-sm text-muted-foreground">{data.asOf} 기준 조직도</p>

      {data.groups.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {data.groups.map((group) => (
            <div
              key={group.id}
              className="flex min-w-48 flex-col gap-2 rounded-md border bg-muted/30 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{group.groupName}</p>
                  {editable && (
                    <EditOrgUnitDialog
                      kind="group"
                      id={group.id}
                      name={group.groupName}
                      description={group.description}
                    />
                  )}
                </div>
                {group.description && (
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.teams.length === 0 ? (
                  <span className="text-xs text-muted-foreground">소속 팀 없음</span>
                ) : (
                  group.teams.map((team) => (
                    <span
                      key={team.id}
                      title={team.description ?? undefined}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm"
                    >
                      {team.teamName}
                      {editable && (
                        <EditOrgUnitDialog
                          kind="team"
                          id={team.id}
                          name={team.teamName}
                          description={team.description}
                        />
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.ungroupedTeams.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">그룹 없는 팀</p>
          <div className="flex flex-wrap gap-2">
            {data.ungroupedTeams.map((team) => (
              <span
                key={team.id}
                title={team.description ?? undefined}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm"
              >
                {team.teamName}
                {editable && (
                  <EditOrgUnitDialog
                    kind="team"
                    id={team.id}
                    name={team.teamName}
                    description={team.description}
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
