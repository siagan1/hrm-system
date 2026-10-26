"use client"

import { toast } from "sonner"

import { deleteCertification } from "@/actions/certification.actions"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button"

export function DeleteCertificationButton({
  certificationId,
  employeeId,
}: {
  certificationId: string
  employeeId: string
}) {
  return (
    <ConfirmDeleteButton
      title="이 자격증을 삭제할까요?"
      onConfirm={async () => {
        await deleteCertification(certificationId, employeeId)
        toast.success("자격증이 삭제되었습니다.")
      }}
      trigger={
        <Button type="button" variant="ghost" size="sm">
          삭제
        </Button>
      }
    />
  )
}
