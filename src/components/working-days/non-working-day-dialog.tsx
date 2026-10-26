"use client"

import { useState, useTransition } from "react"

import {
  removeNonWorkingDay,
  upsertNonWorkingDay,
} from "@/actions/working-day.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function NonWorkingDayDialog({
  /** "YYYY-MM-DD", null이면 닫힘 */
  date,
  existingReason,
  onOpenChange,
}: {
  date: string | null
  existingReason: string | null | undefined
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = existingReason !== undefined
  const [reason, setReason] = useState(existingReason ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Dialog
      open={!!date}
      onOpenChange={(open) => {
        if (!open) {
          setReason("")
          setError(null)
        }
        onOpenChange(open)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {date} {isEdit ? "제외일 수정" : "워킹데이 제외"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="reason">사유</Label>
          <Textarea
            id="reason"
            placeholder="예: 창립기념일, 임시공휴일 등"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter className={isEdit ? "sm:justify-between" : undefined}>
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!date) return
                startTransition(async () => {
                  const result = await removeNonWorkingDay(date)
                  if (result.error) {
                    setError(result.error)
                    return
                  }
                  onOpenChange(false)
                })
              }}
            >
              제외 해제
            </Button>
          )}
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!date) return
              startTransition(async () => {
                const result = await upsertNonWorkingDay(date, reason.trim())
                if (result.error) {
                  setError(result.error)
                  return
                }
                onOpenChange(false)
              })
            }}
          >
            {isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
