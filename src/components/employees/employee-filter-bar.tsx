"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EMP_TYPE_OPTIONS } from "@/lib/employee-constants"

const ALL_VALUE = "__all__"

type Team = {
  id: string
  teamName: string
}

export function EmployeeFilterBar({ teams }: { teams: Team[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState(searchParams.get("name") ?? "")

  // 이름 검색은 타이핑마다 바로 이동하면 매번 서버 왕복이 생기므로 디바운스합니다.
  useEffect(() => {
    const handle = setTimeout(() => {
      const currentName = searchParams.get("name") ?? ""
      if (name === currentName) return

      const params = new URLSearchParams(searchParams.toString())
      if (name) params.set("name", name)
      else params.delete("name")
      params.delete("page")
      router.push(`/employees?${params.toString()}`)
    }, 300)

    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== ALL_VALUE) params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.push(`/employees?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-background p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="employee-search-name">이름 검색</Label>
        <Input
          id="employee-search-name"
          placeholder="이름으로 검색"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>소속 팀</Label>
        <Select
          defaultValue={searchParams.get("teamId") ?? ALL_VALUE}
          onValueChange={(value) => updateParam("teamId", value)}
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

      <div className="flex flex-col gap-2">
        <Label>구분</Label>
        <Select
          defaultValue={searchParams.get("empType") ?? ALL_VALUE}
          onValueChange={(value) => updateParam("empType", value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>전체</SelectItem>
            {EMP_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value="RESIGNED">퇴사자</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(searchParams.get("name") ||
        searchParams.get("teamId") ||
        searchParams.get("empType")) && (
        <button
          type="button"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={() => {
            setName("")
            router.push("/employees")
          }}
        >
          필터 초기화
        </button>
      )}
    </div>
  )
}
