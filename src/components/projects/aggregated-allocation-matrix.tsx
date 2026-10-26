"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import type { AggregatedAllocation } from "@/actions/allocation.actions"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
]

type EmployeeRow = { id: string; name: string; grade: string | null }
type ProjectRef = { id: string; name: string }

function formatMm(value: number) {
  return Number(value.toFixed(2)).toString()
}

/**
 * 상위 프로젝트 + 하위 프로젝트들의 투입 인원을 한 직원×월 매트릭스로 합쳐 보여줍니다.
 * 조회 전용입니다 — 수정/추가는 각 프로젝트의 "투입 인원 관리" 탭에서 해야 하므로,
 * 여기서는 셀을 클릭하면 실제 투입된 프로젝트(1개면 그 프로젝트, 2개 이상 나뉘어
 * 투입됐으면 직원 상세의 "투입 프로젝트" 탭)로 이동만 시킵니다.
 */
export function AggregatedAllocationMatrix({
  allocations,
}: {
  allocations: AggregatedAllocation[]
}) {
  const currentYear = String(new Date().getFullYear())

  const years = useMemo(() => {
    const set = new Set(allocations.map((a) => a.targetMonth.slice(0, 4)))
    set.add(currentYear)
    return Array.from(set).sort()
  }, [allocations, currentYear])

  const [year, setYear] = useState(
    years.includes(currentYear) ? currentYear : years[years.length - 1]
  )

  const cellMap = useMemo(() => {
    const map = new Map<string, { inputMm: number; projects: ProjectRef[] }>()
    for (const allocation of allocations) {
      const key = `${allocation.employee.id}_${allocation.targetMonth}`
      const cell = map.get(key) ?? { inputMm: 0, projects: [] }
      cell.inputMm = Math.round((cell.inputMm + allocation.inputMm) * 100) / 100
      cell.projects.push(allocation.project)
      map.set(key, cell)
    }
    return map
  }, [allocations])

  const rows = useMemo(() => {
    const map = new Map<string, EmployeeRow>()
    for (const allocation of allocations) {
      map.set(allocation.employee.id, {
        id: allocation.employee.id,
        name: allocation.employee.name,
        grade: allocation.employee.grade?.currentGrade ?? null,
      })
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"))
  }, [allocations])

  const monthTotals = MONTH_LABELS.map((_, index) => {
    const targetMonth = `${year}-${String(index + 1).padStart(2, "0")}`
    return rows.reduce((sum, row) => {
      const cell = cellMap.get(`${row.id}_${targetMonth}`)
      return sum + (cell?.inputMm ?? 0)
    }, 0)
  })
  const grandTotal = monthTotals.reduce((sum, v) => sum + v, 0)

  /** 현재 연도 기준 등급별 투입 공수 합계 — 계약 비용 계산 참고용. */
  const gradeTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of rows) {
      const grade = row.grade ?? "등급 미상"
      const rowTotal = MONTH_LABELS.reduce((sum, _, index) => {
        const targetMonth = `${year}-${String(index + 1).padStart(2, "0")}`
        const cell = cellMap.get(`${row.id}_${targetMonth}`)
        return sum + (cell?.inputMm ?? 0)
      }, 0)
      if (rowTotal === 0) continue
      map.set(grade, Math.round(((map.get(grade) ?? 0) + rowTotal) * 100) / 100)
    }
    return map
  }, [rows, cellMap, year])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">연도</span>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
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

      {gradeTotals.size > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">{year}년 등급별 투입 공수</span>
          {Array.from(gradeTotals.entries()).map(([grade, total]) => (
            <span key={grade}>
              {grade} <span className="font-medium tabular-nums">{formatMm(total)}</span> MM
            </span>
          ))}
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-30 min-w-32 bg-muted/50 p-2 text-left font-medium">
                직원
              </th>
              {MONTH_LABELS.map((label) => (
                <th key={label} className="min-w-16 p-2 text-center font-medium">
                  {label}
                </th>
              ))}
              <th className="min-w-16 p-2 text-center font-medium">합계</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="h-24 text-center text-muted-foreground">
                  투입된 인원이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowTotal = MONTH_LABELS.reduce((sum, _, index) => {
                  const targetMonth = `${year}-${String(index + 1).padStart(2, "0")}`
                  const cell = cellMap.get(`${row.id}_${targetMonth}`)
                  return sum + (cell?.inputMm ?? 0)
                }, 0)

                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="sticky left-0 z-10 bg-background p-2 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/employees/${row.id}`} className="hover:underline">
                          {row.name}
                        </Link>
                        {row.grade && <Badge variant="outline">{row.grade}</Badge>}
                      </div>
                    </td>
                    {MONTH_LABELS.map((_, index) => {
                      const targetMonth = `${year}-${String(index + 1).padStart(2, "0")}`
                      const cell = cellMap.get(`${row.id}_${targetMonth}`)

                      if (!cell) {
                        return (
                          <td key={targetMonth} className="p-1 text-center">
                            <span className="text-muted-foreground/40">-</span>
                          </td>
                        )
                      }

                      const href =
                        cell.projects.length === 1
                          ? `/projects/${cell.projects[0].id}?tab=allocations`
                          : `/employees/${row.id}?tab=assignments`
                      const title =
                        cell.projects.length > 1
                          ? cell.projects.map((p) => p.name).join(", ")
                          : cell.projects[0]?.name

                      return (
                        <td key={targetMonth} className="p-1 text-center">
                          <Link
                            href={href}
                            title={title}
                            className={cn(
                              "block rounded px-2 py-1 tabular-nums hover:bg-muted",
                              cell.projects.length > 1 && "underline decoration-dotted"
                            )}
                          >
                            {formatMm(cell.inputMm)}
                          </Link>
                        </td>
                      )
                    })}
                    <td className="p-2 text-center font-medium tabular-nums">
                      {formatMm(rowTotal)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td className="sticky left-0 z-10 bg-muted/30 p-2 font-medium">월 합계</td>
                {monthTotals.map((total, index) => (
                  <td key={MONTH_LABELS[index]} className="p-2 text-center font-medium tabular-nums">
                    {formatMm(total)}
                  </td>
                ))}
                <td className="p-2 text-center font-medium tabular-nums">
                  {formatMm(grandTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
