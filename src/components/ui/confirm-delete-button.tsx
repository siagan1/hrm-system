"use client"

import * as React from "react"
import { useTransition } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

/**
 * 네이티브 confirm() 대신 쓰는 삭제 확인 다이얼로그. 삭제 대상을 구체적으로
 * 보여줘야 하는 경우 description에 목록을 그대로 넣을 수 있습니다(줄바꿈은
 * whitespace-pre-line으로 그대로 보존됩니다).
 */
export function ConfirmDeleteButton({
  trigger,
  title = "정말 삭제하시겠습니까?",
  description,
  confirmLabel = "삭제",
  onConfirm,
  disabled,
}: {
  trigger: React.ReactNode
  title?: string
  description?: React.ReactNode
  confirmLabel?: string
  onConfirm: () => Promise<void> | void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="whitespace-pre-line">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault()
              startTransition(async () => {
                await onConfirm()
                setOpen(false)
              })
            }}
          >
            {isPending ? "처리 중..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
