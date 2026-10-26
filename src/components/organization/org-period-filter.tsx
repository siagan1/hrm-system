"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function OrgPeriodFilter({
  periodStart,
  periodEnd,
}: {
  /** "YYYY-MM-DD" | "" */
  periodStart: string
  periodEnd: string
}) {
  const router = useRouter()
  const hasFilter = !!(periodStart || periodEnd)

  function goRange(start: string, end: string) {
    const params = new URLSearchParams()
    if (start) params.set("start", start)
    if (end) params.set("end", end)
    const query = params.toString()
    router.push(query ? `/teams?${query}` : "/teams")
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-background p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="orgPeriodStart">시작일</Label>
        <Input
          id="orgPeriodStart"
          type="date"
          defaultValue={periodStart}
          className="w-44"
          onChange={(e) => goRange(e.target.value, periodEnd)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="orgPeriodEnd">종료일</Label>
        <Input
          id="orgPeriodEnd"
          type="date"
          defaultValue={periodEnd}
          className="w-44"
          onChange={(e) => goRange(periodStart, e.target.value)}
        />
      </div>
      {hasFilter && (
        <Link
          href="/teams"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          초기화 (오늘 기준으로)
        </Link>
      )}
    </div>
  )
}
