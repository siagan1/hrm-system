"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconAward,
  IconBell,
  IconBuildingCommunity,
  IconCalendarStats,
  IconChartBar,
  IconFolders,
  IconLayoutDashboard,
  IconUserCog,
  IconUsers,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"

const MAIN_NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: IconLayoutDashboard, access: "all" },
  { href: "/employees", label: "직원 관리", icon: IconUsers, access: "all" },
  { href: "/projects", label: "프로젝트 관리", icon: IconFolders, access: "all" },
  { href: "/utilization", label: "가동률 현황", icon: IconChartBar, access: "manager" },
] as const

const ADMIN_NAV_ITEMS = [
  { href: "/teams", label: "조직 관리", icon: IconBuildingCommunity },
  { href: "/working-days", label: "워킹데이 관리", icon: IconCalendarStats },
  { href: "/grade-options", label: "등급 옵션 관리", icon: IconAward },
  { href: "/notification-settings", label: "알림 설정", icon: IconBell },
  { href: "/users", label: "사용자 관리", icon: IconUserCog },
] as const

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string
  label: string
  icon: typeof IconUsers
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  )
}

export function DashboardSidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  const mainItems = MAIN_NAV_ITEMS.filter((item) =>
    item.access === "manager" ? role === "ADMIN" || role === "MANAGER" : true
  )

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b px-6">
        <svg
          className="size-9 shrink-0"
          viewBox="0 0 36 36"
          aria-label="alticast OMS 로고"
        >
          <rect width="36" height="36" rx="8" fill="#18212F" />
          <text
            x="15"
            y="19"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, sans-serif"
            fontWeight="800"
            fontSize="18"
            fill="#ffffff"
            transform="translate(15,19) scale(0.85,1.2) translate(-15,-19)"
          >
            O
          </text>
          <rect x="21" y="8" width="8" height="7" rx="1.5" fill="#E60012" />
          <polygon points="25,15 27.5,15 20,18.5" fill="#E60012" />
        </svg>
        <div className="flex flex-col leading-tight">
          <span className="text-base">
            <span className="font-normal text-muted-foreground">alticast</span>{" "}
            <span className="font-bold">OMS</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            Operation Management System
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {mainItems.map((item) => (
          <NavLink key={item.href} {...item} isActive={isActive(item.href)} />
        ))}

        {role === "ADMIN" && (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground">
              관리자
            </div>
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                isActive={isActive(item.href)}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
