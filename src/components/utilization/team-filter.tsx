"use client"

import { useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ALL_VALUE = "__all__"

export function TeamFilter({
  teamId,
  teams,
}: {
  teamId?: string
  teams: { id: string; teamName: string }[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">소속 팀</span>
      <Select
        defaultValue={teamId ?? ALL_VALUE}
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams.toString())
          if (value && value !== ALL_VALUE) params.set("teamId", value)
          else params.delete("teamId")
          params.delete("page")
          router.push(`/utilization?${params.toString()}`)
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="전체" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>전체</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.teamName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
