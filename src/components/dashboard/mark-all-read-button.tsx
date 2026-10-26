"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { markAllNotificationsRead } from "@/actions/notification.actions"
import { Button } from "@/components/ui/button"

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead()
          toast.success("모든 알림을 읽음 처리했습니다.")
        })
      }
    >
      {isPending ? "처리 중..." : "모두 읽음 처리"}
    </Button>
  )
}
