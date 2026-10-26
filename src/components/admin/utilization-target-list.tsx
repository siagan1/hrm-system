"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { IconTrash } from "@tabler/icons-react"

import {
  deleteUtilizationTarget,
  upsertUtilizationTarget,
  type UtilizationTargetItem,
  type UtilizationTargetState,
} from "@/actions/notification-settings.actions"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFormRemountKey } from "@/hooks/use-form-remount-key"

const initialState: UtilizationTargetState = {}

export function UtilizationTargetList({
  targets,
}: {
  targets: UtilizationTargetItem[]
}) {
  const [state, formAction, isPending] = useActionState(
    upsertUtilizationTarget,
    initialState
  )
  const formKey = useFormRemountKey(state)
  const currentYear = String(new Date().getFullYear())

  useEffect(() => {
    if (state.success) toast.success("가동률 목표치가 저장되었습니다.")
  }, [state])

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <form key={formKey} action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="year">연도</Label>
          <Input
            id="year"
            name="year"
            placeholder="2026"
            defaultValue={state.values?.year ?? currentYear}
            className="w-24"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="targetRatePercent">목표 가동률(%)</Label>
          <Input
            id="targetRatePercent"
            name="targetRatePercent"
            type="number"
            step="0.1"
            min={0}
            max={200}
            placeholder="95"
            defaultValue={state.values?.targetRatePercent}
            className="w-28"
            required
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </form>
      {state.error && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        같은 연도를 다시 저장하면 기존 목표치를 덮어씁니다.
      </p>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>연도</TableHead>
              <TableHead className="text-right">목표 가동률</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                  등록된 연도별 목표가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              targets.map((target) => (
                <TableRow key={target.id}>
                  <TableCell className="font-medium">{target.year}년</TableCell>
                  <TableCell className="text-right">
                    {Math.round(target.targetRate * 1000) / 10}%
                  </TableCell>
                  <TableCell>
                    <ConfirmDeleteButton
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <IconTrash className="size-4" />
                        </Button>
                      }
                      title={`${target.year}년 목표치를 삭제할까요?`}
                      onConfirm={async () => {
                        await deleteUtilizationTarget(target.id)
                        toast.success(`${target.year}년 목표치가 삭제되었습니다.`)
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
