"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { changeEmployeeTeam } from "@/actions/employee.actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Team = {
  id: string
  teamName: string
}

export function TeamCell({
  employeeId,
  employeeName,
  currentTeamId,
  teams,
}: {
  employeeId: string
  employeeName: string
  currentTeamId?: string
  teams: Team[]
}) {
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(currentTeamId ?? "")

  const teamName = (id: string) => teams.find((t) => t.id === id)?.teamName ?? "미배정"

  const applyChange = (teamId: string, previous: string) => {
    startTransition(async () => {
      try {
        await changeEmployeeTeam(employeeId, teamId)
        setValue(teamId)
        toast.success(`${employeeName}님의 소속 팀이 "${teamName(teamId)}"(으)로 변경되었습니다.`, {
          // 목록을 훑어보다 실수로 옆 행을 클릭해도 바로 되돌릴 수 있도록.
          action: previous
            ? {
                label: "실행 취소",
                onClick: () => applyChange(previous, ""),
              }
            : undefined,
        })
      } catch (error) {
        console.error("[changeEmployeeTeam]", error)
        setValue(previous)
        toast.error("소속 팀 변경 중 오류가 발생했습니다.")
      }
    })
  }

  return (
    <Select
      value={value}
      disabled={isPending}
      onValueChange={(next) => applyChange(next, value)}
    >
      <SelectTrigger className="w-40">
        <SelectValue placeholder="미배정" />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.teamName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
