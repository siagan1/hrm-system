import { format } from "date-fns"

import { getHeadcountSummary } from "@/actions/dashboard.actions"

export async function HeadcountSummaryWidget() {
  const targetMonth = format(new Date(), "yyyy-MM")
  const summary = await getHeadcountSummary()

  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="font-semibold">전사 인원 요약 ({targetMonth})</h2>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <div className="flex flex-col justify-center rounded-md border bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">총 인원수</span>
          <span className="text-2xl font-semibold">{summary.totalCount}명</span>
        </div>
        <div className="flex flex-col justify-center rounded-md border bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">프로젝트 투입 가능 총원</span>
          <span className="text-2xl font-semibold text-emerald-600">
            {summary.availableCount}명
          </span>
        </div>
      </div>
    </div>
  )
}
