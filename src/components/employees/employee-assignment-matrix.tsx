import Link from "next/link"

import type { EmployeeProjectRow } from "@/actions/project-assignment.actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
]

function formatMm(value: number) {
  return Number(value.toFixed(2)).toString()
}

export function EmployeeAssignmentMatrix({ rows }: { rows: EmployeeProjectRow[] }) {
  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-40">프로젝트</TableHead>
            {MONTH_LABELS.map((label) => (
              <TableHead key={label} className="min-w-14 text-center">
                {label}
              </TableHead>
            ))}
            <TableHead className="min-w-16 text-center">합계</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={14} className="h-20 text-center text-muted-foreground">
                이 연도에 투입 이력이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const mmByMonth = new Map(
                row.months.map((cell) => [cell.targetMonth.slice(5), cell.inputMm])
              )
              return (
                <TableRow key={row.projectId}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/projects/${row.projectId}?tab=allocations`}
                      className="hover:underline"
                    >
                      {row.projectCode ? `${row.projectCode} ` : ""}
                      {row.projectName}
                    </Link>
                  </TableCell>
                  {MONTH_LABELS.map((_, index) => {
                    const key = String(index + 1).padStart(2, "0")
                    const mm = mmByMonth.get(key)
                    return (
                      <TableCell key={key} className="text-center tabular-nums">
                        {mm !== undefined ? formatMm(mm) : "-"}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center font-medium tabular-nums">
                    {formatMm(row.totalMm)}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
