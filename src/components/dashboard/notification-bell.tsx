import Link from "next/link"
import { IconBell } from "@tabler/icons-react"

import {
  getNotifications,
  getUnreadNotificationCount,
} from "@/actions/notification.actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { isManagerOrAbove } from "@/lib/auth-utils"
import { NotificationReadLink } from "@/components/dashboard/notification-read-link"

export async function NotificationBell() {
  const privileged = await isManagerOrAbove()
  if (!privileged) return null

  const [unreadCount, recent] = await Promise.all([
    getUnreadNotificationCount(),
    getNotifications({ limit: 7 }),
  ])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="알림">
          <IconBell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-2 rounded-full bg-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between font-normal">
          <span className="text-sm font-medium">알림</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">안읽음 {unreadCount}건</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recent.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            알림이 없습니다.
          </p>
        ) : (
          recent.map((n) => (
            <DropdownMenuItem key={n.id} asChild>
              <NotificationReadLink
                id={n.id}
                href={n.link ?? "/notifications"}
                className="flex flex-col items-start gap-0.5 whitespace-normal"
              >
                <span className={n.readAt ? "text-sm" : "text-sm font-medium"}>
                  {n.title}
                </span>
                <span className="text-xs text-muted-foreground">{n.message}</span>
              </NotificationReadLink>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-sm font-medium">
            모두 보기
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
