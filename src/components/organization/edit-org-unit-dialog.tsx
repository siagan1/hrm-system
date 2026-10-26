"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  updateGroupMetadata,
  updateTeamMetadata,
  type OrgUnitMetadataState,
} from "@/actions/org.actions"
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

const initialState: OrgUnitMetadataState = {}

export function EditOrgUnitDialog({
  kind,
  id,
  name,
  description,
}: {
  kind: "group" | "team"
  id: string
  name: string
  description: string | null
}) {
  const [open, setOpen] = useState(false)
  const action = kind === "group" ? updateGroupMetadata : updateTeamMetadata
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formKey = useFormRemountKey(state)
  const nameField = kind === "group" ? "groupName" : "teamName"
  const label = kind === "group" ? "그룹명" : "팀명"

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      toast.success("저장되었습니다.")
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          수정
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label} 수정</DialogTitle>
        </DialogHeader>

        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${kind}-name`}>{label}</Label>
            <Input
              id={`${kind}-name`}
              name={nameField}
              defaultValue={state.values?.[nameField] ?? name}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${kind}-description`}>설명(선택)</Label>
            <Input
              id={`${kind}-description`}
              name="description"
              defaultValue={state.values?.description ?? description ?? ""}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            오타 등 단순 정정용입니다. 조직개편 이력이 남지 않고 즉시 반영됩니다. 그룹/팀
            이동이나 신설·폐지는 &quot;새 조직개편 등록&quot;을 이용하세요.
          </p>

          {state.error && (
            <p className="text-sm font-medium text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
