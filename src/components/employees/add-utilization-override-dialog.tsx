"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createUtilizationOverride,
  type CreateOverrideState,
} from "@/actions/utilization-exclusion.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useFormRemountKey } from "@/hooks/use-form-remount-key"

const initialState: CreateOverrideState = {}

export function AddUtilizationOverrideDialog({
  employeeId,
  excludedFromUtilization,
}: {
  employeeId: string
  excludedFromUtilization: boolean
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(
    createUtilizationOverride,
    initialState
  )
  const formKey = useFormRemountKey(state)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      toast.success("예외 기간이 등록되었습니다.")
    }
  }, [state])

  // 기본 상태의 반대가 예외 기간에서 흔히 쓰는 값이라 기본 선택값으로 미리 잡아줍니다.
  const defaultMode = excludedFromUtilization ? "INCLUDE" : "EXCLUDE"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>예외 기간 추가</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>가동률 예외 기간 추가</DialogTitle>
        </DialogHeader>

        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="employeeId" value={employeeId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="mode">이 기간 동안</Label>
            <Select name="mode" defaultValue={state.values?.mode ?? defaultMode}>
              <SelectTrigger id="mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCLUDE">가동률에 포함</SelectItem>
                <SelectItem value="EXCLUDE">가동률에서 제외</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={state.values?.startDate}
              />
              <p className="text-xs text-muted-foreground">비우면 처음부터</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">종료일</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={state.values?.endDate}
              />
              <p className="text-xs text-muted-foreground">비우면 계속</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">사유</Label>
            <Textarea
              id="reason"
              name="reason"
              rows={2}
              placeholder="예: 인력 부족으로 프로젝트 투입, 휴직 등"
              defaultValue={state.values?.reason}
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
