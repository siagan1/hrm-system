"use client"

import { toast } from "sonner"

import { deleteUserAccount } from "@/actions/user.actions"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button"

export function DeleteUserButton({
  userId,
  disabled,
}: {
  userId: string
  disabled?: boolean
}) {
  return (
    <ConfirmDeleteButton
      title="이 계정을 삭제할까요?"
      description="연결된 직원 기록은 유지되고 로그인만 제거됩니다."
      disabled={disabled}
      onConfirm={async () => {
        const result = await deleteUserAccount(userId)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success("계정이 삭제되었습니다.")
        }
      }}
      trigger={
        <Button type="button" variant="ghost" size="sm" disabled={disabled}>
          삭제
        </Button>
      }
    />
  )
}
