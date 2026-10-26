import { IconLogout } from "@tabler/icons-react"

import { signOut } from "@/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "관리자",
  MANAGER: "매니저",
  USER: "사용자",
}

type CurrentUser = {
  name?: string | null
  email?: string | null
  role: string
}

export function DashboardHeader({ user }: { user: CurrentUser }) {
  const displayName = user.name ?? user.email ?? "사용자"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div />

      <div className="flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2"
            >
              <Avatar className="size-7">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{displayName}</span>
              <Badge variant="secondary">
                {ROLE_LABEL[user.role] ?? user.role}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <IconLogout className="size-4" />
                  로그아웃
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
