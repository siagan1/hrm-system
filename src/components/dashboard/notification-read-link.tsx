"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"

import { markNotificationRead } from "@/actions/notification.actions"

/**
 * DropdownMenuItem asChild로 감싸 쓰는 경우가 있어, Radix Slot이 주입하는
 * role/tabIndex/onClick 등을 전부 전달받아 그대로 넘겨야 합니다(그러지 않으면
 * role="menuitem" 등이 실제 <a>까지 전달되지 않습니다).
 */
export function NotificationReadLink({
  id,
  href,
  onClick,
  ...props
}: { id: string; href: string } & ComponentProps<typeof Link>) {
  const router = useRouter()

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event)
        event.preventDefault()
        markNotificationRead(id).finally(() => router.push(href))
      }}
      {...props}
    />
  )
}
