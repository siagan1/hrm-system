"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type EditTeamRow = {
  tempId: string
  dbId: string | null
  teamName: string
  description: string
  removed: boolean
  activeMemberCount: number
  groupKey: string
}

export function ReorgTeamRow({
  team,
  groupOptions,
  onChange,
  onToggleRemoved,
}: {
  team: EditTeamRow
  groupOptions: { key: string; label: string }[]
  onChange: (patch: Partial<EditTeamRow>) => void
  onToggleRemoved: () => void
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border bg-background p-2",
        team.removed && "opacity-50"
      )}
    >
      <Input
        value={team.teamName}
        onChange={(e) => onChange({ teamName: e.target.value })}
        placeholder="팀명"
        className="w-40"
        disabled={team.removed}
      />
      <Input
        value={team.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="설명(선택)"
        className="w-48"
        disabled={team.removed}
      />
      <Select
        value={team.groupKey}
        onValueChange={(value) => onChange({ groupKey: value })}
        disabled={team.removed}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groupOptions.map((g) => (
            <SelectItem key={g.key} value={g.key}>
              {g.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {team.activeMemberCount > 0 && (
        <span className="text-xs text-muted-foreground">현재 {team.activeMemberCount}명</span>
      )}
      {team.removed && (
        <span className="text-xs text-destructive">삭제 예정</span>
      )}
      <Button
        type="button"
        variant={team.removed ? "outline" : "ghost"}
        size="sm"
        onClick={onToggleRemoved}
        className={team.removed ? "" : "text-destructive"}
      >
        {team.removed ? "복원" : "삭제"}
      </Button>
    </div>
  )
}
