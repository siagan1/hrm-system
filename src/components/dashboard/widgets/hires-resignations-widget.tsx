import Link from "next/link"

import { getDashboardHiresResignations } from "@/actions/dashboard.actions"
import { Badge } from "@/components/ui/badge"

export async function HiresResignationsWidget() {
  const data = await getDashboardHiresResignations()

  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="font-semibold">입사/퇴사 알림 ({data.targetMonth})</h2>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-auto">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">입사 ({data.newHires.length}명)</span>
          <div className="flex flex-wrap gap-1.5">
            {data.newHires.length === 0 ? (
              <span className="text-xs text-muted-foreground">해당 없음</span>
            ) : (
              data.newHires.map((e) => (
                <Badge key={e.id} variant="secondary" asChild>
                  <Link href={`/employees/${e.id}`}>
                    {e.name}
                    {e.detail && `(${e.detail})`}
                  </Link>
                </Badge>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            퇴사 ({data.resignations.length}명)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {data.resignations.length === 0 ? (
              <span className="text-xs text-muted-foreground">해당 없음</span>
            ) : (
              data.resignations.map((e) => (
                <Badge key={e.id} variant="outline" asChild>
                  <Link href={`/employees/${e.id}`}>
                    {e.name}
                    {e.detail && `(${e.detail})`}
                  </Link>
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
