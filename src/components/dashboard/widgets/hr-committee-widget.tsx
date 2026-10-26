import Link from "next/link"
import { format } from "date-fns"

import { getHrCommitteeCandidates } from "@/actions/notification.actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export async function HrCommitteeWidget() {
  const { regularConversions, contractExtensions } = await getHrCommitteeCandidates()
  const rows = [
    ...regularConversions.map((c) => ({ ...c, kind: "정규직 전환" as const })),
    ...contractExtensions.map((c) => ({ ...c, kind: "계약 연장" as const })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="font-semibold">인사위원회 필요인력</h2>
      <p className="text-xs text-muted-foreground">
        알림 설정에 등록된 사전알림 기간 내 대상자입니다.
      </p>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>직원명</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>예정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center text-sm text-muted-foreground">
                  해당하는 직원이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.kind}-${row.id}`}>
                  <TableCell className="font-medium">
                    <Link href={`/employees/${row.id}`} className="hover:underline">
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.kind === "정규직 전환" ? "default" : "secondary"}>
                      {row.kind}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(row.date, "yyyy-MM-dd")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
