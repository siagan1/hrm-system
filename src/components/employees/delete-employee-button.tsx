"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteEmployee } from "@/actions/employee.actions"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button"

export function DeleteEmployeeButton({
  employeeId,
  employeeName,
}: {
  employeeId: string
  employeeName: string
}) {
  const router = useRouter()

  return (
    <ConfirmDeleteButton
      title={`"${employeeName}" 직원을 삭제할까요?`}
      description="투입(MM)·배정·LP 기록이 있으면 삭제할 수 없습니다. 실제 퇴사자라면 삭제 대신 '퇴사일'을 입력해주세요."
      confirmLabel="직원 삭제"
      onConfirm={async () => {
        const result = await deleteEmployee(employeeId)
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success(`"${employeeName}" 직원이 삭제되었습니다.`)
        router.push("/employees")
      }}
      trigger={<Button type="button" variant="destructive">직원 삭제</Button>}
    />
  )
}
