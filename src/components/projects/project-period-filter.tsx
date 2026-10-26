"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ProjectPeriodFilter({
  mode,
  year,
  periodStart,
  periodEnd,
}: {
  mode: "year" | "range"
  /** "YYYY" */
  year: string
  /** "YYYY-MM-DD" — 기간별 모드로 전환할 때 기본값으로 채워줄 현재 조회 기간의 시작일 */
  periodStart: string
  /** "YYYY-MM-DD" */
  periodEnd: string
}) {
  const router = useRouter()

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => String(currentYear - 4 + i))
  if (!years.includes(year)) years.unshift(year)

  function goYearMode(y: string) {
    router.push(`/projects?mode=year&year=${y}`)
  }

  function goRangeMode(start: string, end: string) {
    const params = new URLSearchParams({ mode: "range" })
    if (start) params.set("start", start)
    if (end) params.set("end", end)
    router.push(`/projects?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-background p-4">
      <div className="flex flex-col gap-2">
        <Label>기간 선택 방식</Label>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "year" ? "default" : "outline"}
            onClick={() => goYearMode(year)}
          >
            연도별
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "range" ? "default" : "outline"}
            onClick={() => goRangeMode(periodStart, periodEnd)}
          >
            기간별
          </Button>
        </div>
      </div>

      {mode === "year" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="projectYear">연도</Label>
          <Select value={year} onValueChange={goYearMode}>
            <SelectTrigger id="projectYear" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="periodStart">시작일</Label>
            <Input
              id="periodStart"
              type="date"
              defaultValue={periodStart}
              className="w-44"
              onChange={(e) => {
                if (!e.target.value) return
                goRangeMode(e.target.value, periodEnd)
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="periodEnd">종료일</Label>
            <Input
              id="periodEnd"
              type="date"
              defaultValue={periodEnd}
              className="w-44"
              onChange={(e) => {
                if (!e.target.value) return
                goRangeMode(periodStart, e.target.value)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
