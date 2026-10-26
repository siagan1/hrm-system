"use client"

import { toast } from "sonner"

import { deleteUtilizationOverride } from "@/actions/utilization-exclusion.actions"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button"

export function DeleteUtilizationOverrideButton({
  overrideId,
  employeeId,
}: {
  overrideId: string
  employeeId: string
}) {
  return (
    <ConfirmDeleteButton
      title="이 예외 기간을 삭제할까요?"
      onConfirm={async () => {
        await deleteUtilizationOverride(overrideId, employeeId)
        toast.success("예외 기간이 삭제되었습니다.")
      }}
      trigger={
        <Button type="button" variant="ghost" size="sm">
          삭제
        </Button>
      }
    />
  )
}
