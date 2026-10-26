import { format } from "date-fns"

import { getRecentLpRecords } from "@/actions/dashboard.actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isManagerOrAbove } from "@/lib/auth-utils"

export async function LpRecentWidget() {
  const canView = await isManagerOrAbove()

  if (!canView) {
    return (
      <div className="flex h-full flex-col gap-2">
        <h2 className="font-semibold">최근 LP 등록 현황</h2>
        <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          접근 권한이 없습니다.
        </p>
      </div>
    )
  }

  const records = await getRecentLpRecords()

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="font-semibold">최근 LP 등록 현황</h2>
      <p className="text-xs text-muted-foreground">최근 3개월 내 등록된 기록입니다.</p>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>직원명</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>등록일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-16 text-center text-sm text-muted-foreground"
                >
                  최근 등록된 LP 기록이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.employeeName}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {record.reason}
                  </TableCell>
                  <TableCell>{format(record.createdAt, "yyyy-MM-dd")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
