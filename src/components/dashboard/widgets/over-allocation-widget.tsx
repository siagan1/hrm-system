import Link from "next/link"

import { getOverAllocatedEmployees } from "@/actions/dashboard.actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export async function OverAllocationWidget() {
  const employees = await getOverAllocatedEmployees()

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="font-semibold">과투입 인원</h2>
      <p className="text-xs text-muted-foreground">
        이번 달 가용 공수보다 많이 투입된 인원입니다. 번아웃 위험을 점검하세요.
      </p>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>직원명</TableHead>
              <TableHead>소속 팀</TableHead>
              <TableHead className="text-right">초과 MM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center text-sm text-muted-foreground">
                  해당하는 직원이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <Link href={`/employees/${e.id}`} className="hover:underline">
                      {e.name}
                    </Link>
                  </TableCell>
                  <TableCell>{e.teamName}</TableCell>
                  <TableCell className="text-right text-destructive">
                    {Math.abs(e.idleMm).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
