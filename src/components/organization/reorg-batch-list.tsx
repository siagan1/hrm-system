import Link from "next/link"

import type { ReorgBatch } from "@/actions/org.actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const EPOCH = "1970-01-01"

export function ReorgBatchList({ batches }: { batches: ReorgBatch[] }) {
  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>효력 시작일</TableHead>
            <TableHead>효력 종료일</TableHead>
            <TableHead className="text-right">그룹 수</TableHead>
            <TableHead className="text-right">팀 수</TableHead>
            <TableHead>변경 내역</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                해당 기간에 조직개편 이력이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            batches.map((batch) => {
              const linkStart = batch.effectiveDate ?? EPOCH
              const linkEnd = batch.effectiveDate ?? EPOCH
              return (
                <TableRow key={`${batch.effectiveDate ?? "epoch"}`}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/teams?start=${linkStart}&end=${linkEnd}`}
                      className="hover:underline"
                    >
                      {batch.effectiveDate ?? "처음부터"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {batch.effectiveEndDate ?? <Badge variant="secondary">현재</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{batch.groupCount}</TableCell>
                  <TableCell className="text-right">{batch.teamCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {batch.changedGroupCount === 0 && batch.changedTeamCount === 0
                      ? "-"
                      : `그룹 ${batch.changedGroupCount} · 팀 ${batch.changedTeamCount} 변경`}
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
