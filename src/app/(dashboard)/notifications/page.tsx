import { redirect } from "next/navigation"
import { format } from "date-fns"

import {
  applyDueNotificationChecks,
  getNotifications,
} from "@/actions/notification.actions"
import { MarkAllReadButton } from "@/components/dashboard/mark-all-read-button"
import { NotificationReadLink } from "@/components/dashboard/notification-read-link"
import { Badge } from "@/components/ui/badge"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { isManagerOrAbove } from "@/lib/auth-utils"

const PAGE_SIZE = 20

const TYPE_LABEL: Record<string, string> = {
  UTILIZATION_BELOW_TARGET: "가동률 목표 미달",
  REGULAR_CONVERSION: "정규직 전환",
  CONTRACT_EXTENSION: "계약 연장",
  GRADE_UPGRADE: "등급 상승",
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const canView = await isManagerOrAbove()
  if (!canView) {
    redirect("/")
  }

  await applyDueNotificationChecks()

  const { page: pageParam } = await searchParams
  const page = pageParam ? Number(pageParam) || 1 : 1

  const all = await getNotifications()
  const pageRows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const unreadCount = all.filter((n) => !n.readAt).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">알림함</h1>
          <p className="text-sm text-muted-foreground">
            총 {all.length}건 · 안읽음 {unreadCount}건
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      <div className="rounded-md border bg-background">
        {pageRows.length === 0 ? (
          <p className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            알림이 없습니다.
          </p>
        ) : (
          <ul className="divide-y">
            {pageRows.map((n) => (
              <li key={n.id}>
                <NotificationReadLink
                  id={n.id}
                  href={n.link ?? "/notifications"}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={n.readAt ? "outline" : "default"}>
                      {TYPE_LABEL[n.type] ?? n.type}
                    </Badge>
                    <span className={n.readAt ? "text-sm" : "text-sm font-semibold"}>
                      {n.title}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {format(n.occurredOn, "yyyy-MM-dd")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                </NotificationReadLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={all.length}
        basePath="/notifications"
        searchParams={{}}
      />
    </div>
  )
}
