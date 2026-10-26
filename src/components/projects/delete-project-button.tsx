"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteProject } from "@/actions/project.actions"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button"

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const router = useRouter()

  return (
    <ConfirmDeleteButton
      title={`"${projectName}" 프로젝트를 삭제할까요?`}
      confirmLabel="프로젝트 삭제"
      onConfirm={async () => {
        const result = await deleteProject(projectId)
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success(`"${projectName}" 프로젝트가 삭제되었습니다.`)
        router.push("/projects")
      }}
      trigger={<Button type="button" variant="destructive">프로젝트 삭제</Button>}
    />
  )
}
