import Link from "next/link"
import { redirect } from "next/navigation"

import { getOrgChartAsOf, getReorgBatches } from "@/actions/org.actions"
import { OrgChart } from "@/components/organization/org-chart"
import { OrgPeriodFilter } from "@/components/organization/org-period-filter"
import { ReorgBatchList } from "@/components/organization/reorg-batch-list"
import { Button } from "@/components/ui/button"
import { isAdmin } from "@/lib/auth-utils"

const EPOCH = new Date(0)

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  const admin = await isAdmin()
  if (!admin) {
    redirect("/")
  }

  const { start, end } = await searchParams
  const periodStart = start ? new Date(start) : undefined
  const periodEnd = end ? new Date(end) : undefined

  const batches = await getReorgBatches(periodStart, periodEnd)

  const chartAsOf = periodStart
    ? (() => {
        const topDate = batches[0]?.effectiveDate
        return topDate ? new Date(topDate) : EPOCH
      })()
    : new Date()

  const chart = await getOrgChartAsOf(chartAsOf)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">조직 관리</h1>
          <p className="text-sm text-muted-foreground">
            {periodStart || periodEnd
              ? `검색 기간 기준 조직개편 이력 ${batches.length}건`
              : `전체 조직개편 이력 ${batches.length}건`}
          </p>
        </div>
        <Button asChild>
          <Link href="/teams/reorg">새 조직개편 등록</Link>
        </Button>
      </div>

      <OrgPeriodFilter periodStart={start ?? ""} periodEnd={end ?? ""} />

      <ReorgBatchList batches={batches} />

      <OrgChart data={chart} editable={!periodStart && !periodEnd} />
    </div>
  )
}
