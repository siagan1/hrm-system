import Link from "next/link"

import type { UtilizationMatrix as UtilizationMatrixData } from "@/actions/utilization.actions"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
]

function formatRate(rate: number) {
  return `${Math.round(rate * 100)}%`
}

function formatMm(value: number) {
  return Number(value.toFixed(2)).toString()
}

function rateColorClass(rate: number | null) {
  if (rate === null) return "bg-muted/40 text-muted-foreground/40"
  if (rate === 0) return "bg-destructive/10 text-destructive"
  if (rate < 0.7) return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
  if (rate <= 1.15) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
  return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
}

/** 여러 달의 셀을 합산해 가용/투입 절대치와, 합산 기준(투입 합계 ÷ 가용 합계) 투입율을 만듭니다. */
function aggregate(cells: { availableMm: number | null; inputMm: number }[]) {
  const totalAvailable = Math.round(cells.reduce((sum, c) => sum + (c.availableMm ?? 0), 0) * 100) / 100
  const totalInput = Math.round(cells.reduce((sum, c) => sum + c.inputMm, 0) * 100) / 100
  const rate = totalAvailable > 0 ? Math.round((totalInput / totalAvailable) * 100) / 100 : null
  return { totalAvailable, totalInput, noWork: Math.round((totalAvailable - totalInput) * 100) / 100, rate }
}

export function UtilizationMatrix({ data }: { data: UtilizationMatrixData }) {
  const columnTotals = MONTH_LABELS.map((_, index) =>
    aggregate(data.rows.map((row) => row.months[index])).rate
  )
  const grandAggregate = aggregate(data.rows.flatMap((row) => row.months))
  const grandTotal = grandAggregate.rate

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/30 p-3 text-sm">
        <span>
          연간 총 가용 <span className="font-medium tabular-nums">{grandAggregate.totalAvailable}</span> MM
        </span>
        <span>
          연간 총 투입 <span className="font-medium tabular-nums">{grandAggregate.totalInput}</span> MM
        </span>
        <span>
          연간 No-work(유휴){" "}
          <span className="font-medium tabular-nums text-destructive">{grandAggregate.noWork}</span> MM
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-destructive/10" /> 노워크(0%)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-amber-100 dark:bg-amber-950" /> 저투입(&lt;70%)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-emerald-100 dark:bg-emerald-950" /> 적정(70~115%)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-blue-100 dark:bg-blue-950" /> 과투입(&gt;115%)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-muted/40" /> 해당 월 미재직
        </span>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-30 min-w-32 bg-muted/50 p-2 text-left font-medium">
                직원
              </th>
              <th className="min-w-20 p-2 text-left font-medium">팀</th>
              {MONTH_LABELS.map((label) => (
                <th key={label} className="min-w-14 p-2 text-center font-medium">
                  {label}
                </th>
              ))}
              <th className="min-w-16 p-2 text-center font-medium">연간</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="h-24 text-center text-muted-foreground">
                  등록된 직원이 없습니다.
                </td>
              </tr>
            ) : (
              data.rows.map((row) => {
                const rowRate = aggregate(row.months).rate
                return (
                  <tr key={row.employeeId ?? row.name} className="border-b last:border-0">
                    <td className="sticky left-0 z-10 bg-background p-2 font-medium">
                      {row.employeeId ? (
                        <Link href={`/employees/${row.employeeId}`} className="hover:underline">
                          {row.name}
                        </Link>
                      ) : (
                        <span className="flex flex-wrap items-center gap-1.5">
                          {row.name}
                          <Badge variant="secondary">가상</Badge>
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">{row.teamName}</td>
                    {row.months.map((cell) => {
                      const cellClassName = cn(
                        "block rounded px-1 py-1 tabular-nums",
                        rateColorClass(cell.rate),
                        cell.projects.length > 0 && "cursor-pointer hover:opacity-70"
                      )
                      const cellTitle =
                        cell.availableMm > 0
                          ? `가용 ${cell.availableMm.toFixed(2)}MM / 투입 ${cell.inputMm.toFixed(2)}MM (${formatRate(cell.rate!)})${
                              cell.projects.length > 0
                                ? ` — 클릭 시 ${cell.projects.length > 1 ? "직원 상세로 이동" : "프로젝트로 이동"}`
                                : ""
                            }`
                          : "해당 월 미재직"
                      const cellContent = cell.rate !== null ? formatMm(cell.inputMm) : "-"
                      const href =
                        cell.projects.length === 1
                          ? `/projects/${cell.projects[0].id}?tab=allocations`
                          : cell.projects.length >= 2
                            ? `/employees/${row.employeeId}?tab=assignments`
                            : null

                      return (
                        <td key={cell.targetMonth} className="p-1 text-center">
                          {href ? (
                            <Link href={href} className={cellClassName} title={cellTitle}>
                              {cellContent}
                            </Link>
                          ) : (
                            <div className={cellClassName} title={cellTitle}>
                              {cellContent}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="p-2 text-center font-medium tabular-nums">
                      {rowRate !== null ? formatRate(rowRate) : "-"}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {data.rows.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td className="sticky left-0 z-10 bg-muted/30 p-2 font-medium" colSpan={2}>
                  전체 평균
                </td>
                {columnTotals.map((rate, index) => (
                  <td
                    key={MONTH_LABELS[index]}
                    className="p-2 text-center font-medium tabular-nums"
                  >
                    {rate !== null ? formatRate(rate) : "-"}
                  </td>
                ))}
                <td className="p-2 text-center font-medium tabular-nums">
                  {grandTotal !== null ? formatRate(grandTotal) : "-"}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
