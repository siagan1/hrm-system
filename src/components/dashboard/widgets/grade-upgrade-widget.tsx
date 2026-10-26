import Link from "next/link"
import { format } from "date-fns"

import { getGradeUpgradeCandidates } from "@/actions/notification.actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export async function GradeUpgradeWidget() {
  const candidates = await getGradeUpgradeCandidates()

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="font-semibold">등급 상승 임박</h2>
      <p className="text-xs text-muted-foreground">
        알림 설정에 등록된 사전알림 기간 내 등급 상승이 예상되는 인원입니다.
      </p>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>직원명</TableHead>
              <TableHead>승급 예정 등급</TableHead>
              <TableHead>예상 도달일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center text-sm text-muted-foreground">
                  해당하는 직원이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((c) => (
                <TableRow key={`${c.id}-${c.gradeName}`}>
                  <TableCell className="font-medium">
                    <Link href={`/employees/${c.id}?tab=grade`} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>{c.gradeName}</TableCell>
                  <TableCell>{format(c.projectedDate, "yyyy-MM-dd")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
