"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import {
  deleteEmployeeAllocations,
  type ProjectAllocationWithEmployee,
} from "@/actions/allocation.actions"
import { AllocationDialog } from "@/components/projects/allocation-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button"
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

type EmployeeOption = { id: string; name: string }
type EmployeeRow = { id: string; name: string; grade: string | null }

function formatMm(value: number) {
  return Number(value.toFixed(2)).toString()
}

function DeleteEmployeeAllocationsButton({
  projectId,
  employeeId,
  employeeName,
  months,
}: {
  projectId: string
  employeeId: string
  employeeName: string
  months: string[]
}) {
  return (
    <ConfirmDeleteButton
      title={`${employeeName}님의 투입 기록을 전부 삭제할까요?`}
      description={`이 프로젝트에서 연도 구분 없이 전부 삭제합니다. 되돌릴 수 없습니다.\n\n삭제될 달(${months.length}건): ${months.join(", ")}`}
      onConfirm={async () => {
        await deleteEmployeeAllocations(employeeId, projectId)
        toast.success(`${employeeName}님의 투입 기록이 삭제되었습니다.`)
      }}
      trigger={
        <button
          type="button"
          title={`${employeeName} 투입 기록 전체 삭제`}
          className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none"
        >
          <IconTrash className="size-3.5" />
        </button>
      }
    />
  )
}

export function AllocationMatrix({
  projectId,
  employees,
  allocations,
  canEdit,
}: {
  projectId: string
  employees: EmployeeOption[]
  allocations: ProjectAllocationWithEmployee[]
  canEdit: boolean
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
  const [extraEmployeeIds, setExtraEmployeeIds] = useState<string[]>([])
  const [addingEmployeeId, setAddingEmployeeId] = useState("")

  const cellMap = useMemo(() => {
    const map = new Map<string, ProjectAllocationWithEmployee>()
    for (const allocation of allocations) {
      map.set(`${allocation.employee.id}_${allocation.targetMonth}`, allocation)
    }
    return map
  }, [allocations])

  /** 행 삭제 확인창에 보여줄 목록 — 연도 구분 없이 그 직원의 전체 투입 달. */
  const monthsByEmployee = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const allocation of allocations) {
      const list = map.get(allocation.employee.id) ?? []
      list.push(allocation.targetMonth)
      map.set(allocation.employee.id, list)
    }
    for (const list of map.values()) list.sort()
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
    for (const id of extraEmployeeIds) {
      if (map.has(id)) continue
      const employee = employees.find((e) => e.id === id)
      if (employee) map.set(id, { ...employee, grade: null })
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"))
  }, [allocations, extraEmployeeIds, employees])

  /** 현재 연도 기준 등급별 투입 공수 합계 — 계약 비용 계산 참고용. */
  const gradeTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of rows) {
      const grade = row.grade ?? "등급 미상"
      const rowTotal = MONTH_LABELS.reduce((sum, _, index) => {
        const targetMonth = `${year}-${String(index + 1).padStart(2, "0")}`
        const allocation = cellMap.get(`${row.id}_${targetMonth}`)
        return sum + (allocation?.inputMm ?? 0)
      }, 0)
      if (rowTotal === 0) continue
      map.set(grade, Math.round(((map.get(grade) ?? 0) + rowTotal) * 100) / 100)
    }
    return map
  }, [rows, cellMap, year])

  const employeesNotInMatrix = employees.filter(
    (e) => !rows.some((row) => row.id === e.id)
  )

  const monthTotals = MONTH_LABELS.map((_, index) => {
    const targetMonth = `${year}-${String(index + 1).padStart(2, "0")}`
    return rows.reduce((sum, row) => {
      const allocation = cellMap.get(`${row.id}_${targetMonth}`)
      return sum + (allocation?.inputMm ?? 0)
    }, 0)
  })
  const grandTotal = monthTotals.reduce((sum, v) => sum + v, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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

        {canEdit && employeesNotInMatrix.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={addingEmployeeId} onValueChange={setAddingEmployeeId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="직원 추가" />
              </SelectTrigger>
              <SelectContent>
                {employeesNotInMatrix.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!addingEmployeeId}
              onClick={() => {
                if (!addingEmployeeId) return
                setExtraEmployeeIds((prev) => [...prev, addingEmployeeId])
                setAddingEmployeeId("")
              }}
            >
              추가
            </Button>
          </div>
        )}
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
                <td
                  colSpan={14}
                  className="h-24 text-center text-muted-foreground"
                >
                  투입된 인원이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowTotal = MONTH_LABELS.reduce((sum, _, index) => {
                  const targetMonth = `${year}-${String(index + 1).padStart(2, "0")}`
                  const allocation = cellMap.get(`${row.id}_${targetMonth}`)
                  return sum + (allocation?.inputMm ?? 0)
                }, 0)

                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="sticky left-0 z-10 bg-background p-2 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/employees/${row.id}`} className="hover:underline">
                          {row.name}
                        </Link>
                        {row.grade && <Badge variant="outline">{row.grade}</Badge>}
                        {canEdit && (monthsByEmployee.get(row.id)?.length ?? 0) > 0 && (
                          <DeleteEmployeeAllocationsButton
                            projectId={projectId}
                            employeeId={row.id}
                            employeeName={row.name}
                            months={monthsByEmployee.get(row.id) ?? []}
                          />
                        )}
                      </div>
                    </td>
                    {MONTH_LABELS.map((_, index) => {
                      const targetMonth = `${year}-${String(index + 1).padStart(2, "0")}`
                      const allocation = cellMap.get(`${row.id}_${targetMonth}`)

                      return (
                        <td key={targetMonth} className="p-1 text-center">
                          {allocation ? (
                            canEdit ? (
                              <AllocationDialog
                                projectId={projectId}
                                employees={employees}
                                allocation={{
                                  id: allocation.id,
                                  employeeId: row.id,
                                  employeeName: row.name,
                                  targetMonth,
                                  inputMm: allocation.inputMm,
                                  isManualMm: allocation.isManualMm,
                                }}
                                trigger={
                                  <button
                                    type="button"
                                    className={cn(
                                      "w-full rounded px-2 py-1 tabular-nums hover:bg-muted",
                                      allocation.isManualMm && "text-blue-600 dark:text-blue-400"
                                    )}
                                  >
                                    {formatMm(allocation.inputMm)}
                                  </button>
                                }
                              />
                            ) : (
                              <span className="tabular-nums">
                                {formatMm(allocation.inputMm)}
                              </span>
                            )
                          ) : canEdit ? (
                            <AllocationDialog
                              projectId={projectId}
                              employees={employees}
                              defaultEmployeeId={row.id}
                              defaultEmployeeName={row.name}
                              defaultTargetMonth={targetMonth}
                              trigger={
                                <button
                                  type="button"
                                  className="w-full rounded px-2 py-1 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
                                >
                                  +
                                </button>
                              }
                            />
                          ) : (
                            <span className="text-muted-foreground/40">-</span>
                          )}
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
                <td className="sticky left-0 z-10 bg-muted/30 p-2 font-medium">
                  월 합계
                </td>
                {monthTotals.map((total, index) => (
                  <td
                    key={MONTH_LABELS[index]}
                    className="p-2 text-center font-medium tabular-nums"
                  >
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
