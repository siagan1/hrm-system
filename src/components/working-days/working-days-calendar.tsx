"use client"

import { useMemo, useState } from "react"

import type { NonWorkingDayEntry } from "@/actions/working-day.actions"
import { NonWorkingDayDialog } from "@/components/working-days/non-working-day-dialog"
import { cn } from "@/lib/utils"

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function buildMonthDays(year: number, month: number) {
  // month: 1-12
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells: Array<{ day: number; date: string; weekday: number } | null> = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(Date.UTC(year, month - 1, d))
    cells.push({ day: d, date: `${year}-${pad(month)}-${pad(d)}`, weekday: date.getUTCDay() })
  }
  return cells
}

function MonthCard({
  year,
  month,
  excludedMap,
  onSelectDate,
}: {
  year: number
  month: number
  excludedMap: Map<string, string | null>
  onSelectDate: (date: string) => void
}) {
  const cells = useMemo(() => buildMonthDays(year, month), [year, month])
  const excludedCount = cells.filter((c) => c && excludedMap.has(c.date)).length
  const workingDayCount = cells.filter(
    (c) => c && c.weekday !== 0 && c.weekday !== 6 && !excludedMap.has(c.date)
  ).length

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-medium">{month}월</h3>
        <span className="text-xs text-muted-foreground">근무일 {workingDayCount}일</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "py-1 font-medium text-muted-foreground",
              (i === 0 || i === 6) && "text-muted-foreground/60"
            )}
          >
            {label}
          </div>
        ))}
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} />

          const isWeekend = cell.weekday === 0 || cell.weekday === 6
          const isExcluded = excludedMap.has(cell.date)

          if (isWeekend && !isExcluded) {
            return (
              <div
                key={cell.date}
                className="rounded py-1 text-muted-foreground/40"
              >
                {cell.day}
              </div>
            )
          }

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              title={isExcluded ? excludedMap.get(cell.date) || "제외됨" : undefined}
              className={cn(
                "rounded py-1 transition-colors hover:bg-muted",
                isExcluded && "bg-destructive/10 font-medium text-destructive hover:bg-destructive/20"
              )}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
      {excludedCount > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">제외일 {excludedCount}일</p>
      )}
    </div>
  )
}

export function WorkingDaysCalendar({
  year,
  nonWorkingDays,
}: {
  year: string
  nonWorkingDays: NonWorkingDayEntry[]
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const excludedMap = useMemo(
    () => new Map(nonWorkingDays.map((d) => [d.date, d.reason])),
    [nonWorkingDays]
  )

  const yearNum = Number(year)
  const selectedReason = selectedDate ? excludedMap.get(selectedDate) : undefined

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <MonthCard
            key={month}
            year={yearNum}
            month={month}
            excludedMap={excludedMap}
            onSelectDate={setSelectedDate}
          />
        ))}
      </div>

      <NonWorkingDayDialog
        date={selectedDate}
        existingReason={selectedReason}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null)
        }}
      />
    </>
  )
}
