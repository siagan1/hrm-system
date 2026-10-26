"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ReorgTeamRow, type EditTeamRow } from "./reorg-team-row"

export type EditGroupRow = {
  tempId: string
  dbId: string | null
  groupName: string
  description: string
  removed: boolean
}

export function ReorgGroupCard({
  group,
  teams,
  groupOptions,
  onGroupChange,
  onToggleGroupRemoved,
  onTeamChange,
  onToggleTeamRemoved,
  onAddTeam,
}: {
  group: EditGroupRow
  teams: EditTeamRow[]
  groupOptions: { key: string; label: string }[]
  onGroupChange: (patch: Partial<EditGroupRow>) => void
  onToggleGroupRemoved: () => void
  onTeamChange: (teamTempId: string, patch: Partial<EditTeamRow>) => void
  onToggleTeamRemoved: (teamTempId: string) => void
  onAddTeam: () => void
}) {
  return (
    <div
      className={cn("flex flex-col gap-3 rounded-md border p-4", group.removed && "opacity-50")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={group.groupName}
          onChange={(e) => onGroupChange({ groupName: e.target.value })}
          placeholder="그룹명"
          className="w-48 font-medium"
          disabled={group.removed}
        />
        <Input
          value={group.description}
          onChange={(e) => onGroupChange({ description: e.target.value })}
          placeholder="설명(선택)"
          className="w-56"
          disabled={group.removed}
        />
        {group.removed && <span className="text-xs text-destructive">삭제 예정</span>}
        <Button
          type="button"
          variant={group.removed ? "outline" : "ghost"}
          size="sm"
          onClick={onToggleGroupRemoved}
          className={group.removed ? "" : "text-destructive"}
        >
          {group.removed ? "그룹 복원" : "그룹 삭제"}
        </Button>
      </div>

      {!group.removed && (
        <div className="flex flex-col gap-2 pl-4">
          {teams.map((team) => (
            <ReorgTeamRow
              key={team.tempId}
              team={team}
              groupOptions={groupOptions}
              onChange={(patch) => onTeamChange(team.tempId, patch)}
              onToggleRemoved={() => onToggleTeamRemoved(team.tempId)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddTeam}
            className="w-fit"
          >
            + 팀 추가
          </Button>
        </div>
      )}
    </div>
  )
}
