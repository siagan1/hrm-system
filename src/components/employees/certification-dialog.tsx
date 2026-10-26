"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createCertification,
  type CreateCertificationState,
} from "@/actions/certification.actions"
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
import { useFormRemountKey } from "@/hooks/use-form-remount-key"

const initialState: CreateCertificationState = {}

export function CertificationDialog({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(
    createCertification,
    initialState
  )
  const formKey = useFormRemountKey(state)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      toast.success("자격증이 등록되었습니다.")
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>자격증 등록</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>자격증 등록</DialogTitle>
        </DialogHeader>

        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="employeeId" value={employeeId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">자격증명</Label>
            <Input
              id="name"
              name="name"
              placeholder="예: 정보처리기사"
              defaultValue={state.values?.name}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="acquiredDate">취득일</Label>
            <Input
              id="acquiredDate"
              name="acquiredDate"
              type="date"
              defaultValue={state.values?.acquiredDate}
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
