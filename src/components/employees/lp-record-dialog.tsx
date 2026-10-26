"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createLpRecord,
  type CreateLpRecordState,
} from "@/actions/lp-record.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useFormRemountKey } from "@/hooks/use-form-remount-key"

const initialState: CreateLpRecordState = {}

export function LpRecordDialog({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(
    createLpRecord,
    initialState
  )
  const formKey = useFormRemountKey(state)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      toast.success("LP 기록이 등록되었습니다.")
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>LP 등록</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>LP(성과개선) 등록</DialogTitle>
        </DialogHeader>

        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="employeeId" value={employeeId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">지정 사유</Label>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              defaultValue={state.values?.reason}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="actionPlan">향후 조치 계획</Label>
            <Textarea
              id="actionPlan"
              name="actionPlan"
              rows={3}
              defaultValue={state.values?.actionPlan}
              required
            />
          </div>

          {state.error && (
            <p className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
