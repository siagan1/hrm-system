import Link from "next/link"

import { getDashboardNoWorkTrend } from "@/actions/dashboard.actions"
import { Badge } from "@/components/ui/badge"

export async function NoWorkTrendWidget() {
  const months = await getDashboardNoWorkTrend()

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="font-semibold">노워크 인원 (이번 달부터 3개월)</h2>
      <p className="text-xs text-muted-foreground">
        해당 월에 가동 공수를 다 채우지 못한(완전 유휴 포함) 인원입니다.
      </p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-destructive/60" /> 완전 유휴(0%)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-amber-400 dark:bg-amber-600" /> 저가동(&lt;100%)
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col gap-3">
          {months.map((m) => (
            <div key={m.targetMonth} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{m.targetMonth}</span>
                <span
                  className={
                    m.employees.length > 0
                      ? "text-xs text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {m.employees.length}명
                  {m.employees.length > 0 ? ` · ${m.totalIdleMm}MM` : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.employees.length === 0 ? (
                  <span className="text-xs text-muted-foreground">해당 없음</span>
                ) : (
                  m.employees.map((e) => (
                    <Badge
                      key={e.id}
                      variant={e.rate === 0 ? "destructive" : "outline"}
                      className={
                        e.rate === 0
                          ? undefined
                          : "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }
                      asChild
                    >
                      <Link href={`/employees/${e.id}`}>
                        {e.name} ({e.idleMm}MM)
                      </Link>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
