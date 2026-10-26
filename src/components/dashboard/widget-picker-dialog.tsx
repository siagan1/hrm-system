"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"

import { addWidgetToDashboardLayout } from "@/actions/dashboard.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { WidgetLayoutItem } from "@/lib/dashboard-defaults"
import { WIDGET_CATALOG } from "@/lib/widget-catalog"

export function WidgetPickerDialog({
  currentWidgetIds,
  canManage,
  onAdded,
}: {
  currentWidgetIds: string[]
  canManage: boolean
  /** 서버에 저장된 최신 전체 레이아웃으로 그리드의 로컬 상태를 동기화합니다. */
  onAdded: (layout: WidgetLayoutItem[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const router = useRouter()

  const available = WIDGET_CATALOG.filter(
    (item) =>
      !currentWidgetIds.includes(item.id) && (canManage || !item.requiresManager)
  )

  function handleAdd(widgetId: string) {
    setPendingId(widgetId)
    startTransition(async () => {
      const result = await addWidgetToDashboardLayout(widgetId)
      setPendingId(null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.layout) onAdded(result.layout)
      toast.success("위젯이 추가되었습니다.")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <IconPlus className="size-4" />
          위젯 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>위젯 추가</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-auto">
          {available.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              모든 위젯이 이미 추가되어 있습니다.
            </p>
          ) : (
            available.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAdd(item.id)}
                >
                  {isPending && pendingId === item.id ? "추가 중..." : "추가"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
