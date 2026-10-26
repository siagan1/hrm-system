import Link from "next/link"

import type {
  UtilizationMonthlyPerson,
  UtilizationYearlyMonthSummary,
} from "@/actions/utilization.actions"
import { Badge } from "@/components/ui/badge"
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

function PersonBadges({
  people,
  variant = "outline",
}: {
  people: UtilizationMonthlyPerson[]
  variant?: "outline" | "secondary" | "destructive"
}) {
  if (people.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {people.map((person) => (
        <Badge key={person.id + (person.detail ?? "")} variant={variant} asChild>
          <Link href={`/employees/${person.id}`}>
            {person.name}
            {person.idleMm !== undefined && `(${person.idleMm.toFixed(2)})`}
            {person.detail && `(${person.detail})`}
          </Link>
        </Badge>
      ))}
    </div>
  )
}

const ROWS: {
  label: string
  variant: "outline" | "secondary" | "destructive"
  pick: (m: UtilizationYearlyMonthSummary) => UtilizationMonthlyPerson[]
}[] = [
  { label: "노워크", variant: "destructive", pick: (m) => m.noWorkEmployees },
  { label: "입사", variant: "secondary", pick: (m) => m.newHires },
  { label: "퇴사", variant: "outline", pick: (m) => m.resignations },
  { label: "LP", variant: "outline", pick: (m) => m.lpRecords },
]

export function MonthlyEventLog({ months }: { months: UtilizationYearlyMonthSummary[] }) {
  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-16">구분</TableHead>
            {MONTH_LABELS.map((label) => (
              <TableHead key={label} className="min-w-28 text-center">
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              {months.map((m) => (
                <TableCell key={m.targetMonth} className="align-top text-center">
                  <div className="flex justify-center">
                    <PersonBadges people={row.pick(m)} variant={row.variant} />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
