"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  submitReorg,
  type EditableGroup,
  type EditableTeam,
} from "@/actions/org.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ReorgGroupCard, type EditGroupRow } from "./reorg-group-card"
import { ReorgTeamRow, type EditTeamRow } from "./reorg-team-row"

const UNGROUPED = "ungrouped"

function generateTempId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function todayInputValue(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function ReorgEditor({
  initial,
}: {
  initial: { groups: EditableGroup[]; ungroupedTeams: EditableTeam[] }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [effectiveDate, setEffectiveDate] = useState(todayInputValue())

  const [groups, setGroups] = useState<EditGroupRow[]>(() =>
    initial.groups.map((g) => ({
      tempId: g.id,
      dbId: g.id,
      groupName: g.groupName,
      description: g.description ?? "",
      removed: false,
    }))
  )
  const [teams, setTeams] = useState<EditTeamRow[]>(() => [
    ...initial.groups.flatMap((g) =>
      g.teams.map((t) => ({
        tempId: t.id,
        dbId: t.id,
        teamName: t.teamName,
        description: t.description ?? "",
        removed: false,
        activeMemberCount: t.activeMemberCount,
        groupKey: g.id,
      }))
    ),
    ...initial.ungroupedTeams.map((t) => ({
      tempId: t.id,
      dbId: t.id,
      teamName: t.teamName,
      description: t.description ?? "",
      removed: false,
      activeMemberCount: t.activeMemberCount,
      groupKey: UNGROUPED,
    })),
  ])

  const liveGroups = groups.filter((g) => !g.removed)
  const groupOptions = [
    { key: UNGROUPED, label: "그룹 없음(최상위)" },
    ...liveGroups.map((g) => ({ key: g.tempId, label: g.groupName || "(이름 없음)" })),
  ]
  const ungroupedTeams = teams.filter((t) => t.groupKey === UNGROUPED)

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { tempId: generateTempId(), dbId: null, groupName: "", description: "", removed: false },
    ])
  }

  function updateGroup(tempId: string, patch: Partial<EditGroupRow>) {
    setGroups((prev) => prev.map((g) => (g.tempId === tempId ? { ...g, ...patch } : g)))
  }

  function toggleGroupRemoved(tempId: string) {
    const group = groups.find((g) => g.tempId === tempId)
    if (!group) return
    if (!group.removed) {
      const stillAssigned = teams.some((t) => t.groupKey === tempId && !t.removed)
      if (stillAssigned) {
        alert("이 그룹에 소속된 팀이 있습니다. 먼저 팀을 다른 그룹으로 이동하거나 삭제해주세요.")
        return
      }
    }
    setGroups((prev) => prev.map((g) => (g.tempId === tempId ? { ...g, removed: !g.removed } : g)))
  }

  function addTeam(groupKey: string) {
    setTeams((prev) => [
      ...prev,
      {
        tempId: generateTempId(),
        dbId: null,
        teamName: "",
        description: "",
        removed: false,
        activeMemberCount: 0,
        groupKey,
      },
    ])
  }

  function updateTeam(tempId: string, patch: Partial<EditTeamRow>) {
    setTeams((prev) => prev.map((t) => (t.tempId === tempId ? { ...t, ...patch } : t)))
  }

  function toggleTeamRemoved(tempId: string) {
    const team = teams.find((t) => t.tempId === tempId)
    if (!team) return
    if (!team.removed && team.activeMemberCount > 0) {
      const ok = confirm(
        `현재 ${team.activeMemberCount}명이 배정된 팀입니다. 삭제하려면 먼저 소속을 변경해야 합니다. 그래도 삭제 예정으로 표시할까요? (저장 시 거부됩니다)`
      )
      if (!ok) return
    }
    setTeams((prev) => prev.map((t) => (t.tempId === tempId ? { ...t, removed: !t.removed } : t)))
  }

  function handleSubmit() {
    setError(null)

    const liveGroupKeys = new Set(liveGroups.map((g) => g.tempId))
    const liveTeams = teams.filter((t) => !t.removed)

    const input = {
      effectiveDate,
      groups: liveGroups.map((g) => ({
        id: g.dbId,
        groupName: g.groupName,
        description: g.description || null,
        teams: liveTeams
          .filter((t) => t.groupKey === g.tempId)
          .map((t) => ({ id: t.dbId, teamName: t.teamName, description: t.description || null })),
      })),
      ungroupedTeams: liveTeams
        .filter((t) => t.groupKey === UNGROUPED || !liveGroupKeys.has(t.groupKey))
        .map((t) => ({ id: t.dbId, teamName: t.teamName, description: t.description || null })),
    }

    startTransition(async () => {
      const result = await submitReorg(input)
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success("조직 개편이 저장되었습니다.")
      router.push("/teams")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="effectiveDate">효력일</Label>
        <Input
          id="effectiveDate"
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          className="w-44"
        />
        <p className="text-xs text-muted-foreground">
          이 날짜부터 아래 구조가 적용됩니다. 가장 최근 조직개편보다 이후 날짜여야 합니다.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <ReorgGroupCard
            key={group.tempId}
            group={group}
            teams={teams.filter((t) => t.groupKey === group.tempId)}
            groupOptions={groupOptions}
            onGroupChange={(patch) => updateGroup(group.tempId, patch)}
            onToggleGroupRemoved={() => toggleGroupRemoved(group.tempId)}
            onTeamChange={updateTeam}
            onToggleTeamRemoved={toggleTeamRemoved}
            onAddTeam={() => addTeam(group.tempId)}
          />
        ))}

        <Button type="button" variant="outline" onClick={addGroup} className="w-fit">
          + 그룹 추가
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-md border p-4">
        <p className="font-medium">그룹 없는 팀</p>
        <div className="flex flex-col gap-2 pl-4">
          {ungroupedTeams.map((team) => (
            <ReorgTeamRow
              key={team.tempId}
              team={team}
              groupOptions={groupOptions}
              onChange={(patch) => updateTeam(team.tempId, patch)}
              onToggleRemoved={() => toggleTeamRemoved(team.tempId)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTeam(UNGROUPED)}
            className="w-fit"
          >
            + 팀 추가
          </Button>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "저장 중..." : "이 내용으로 조직개편 적용"}
        </Button>
      </div>
    </div>
  )
}
