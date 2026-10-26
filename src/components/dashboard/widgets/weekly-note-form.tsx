"use client"

import { useActionState, useEffect } from "react"
import { format } from "date-fns"
import { toast } from "sonner"

import {
  updateWeeklyNote,
  type WeeklyNoteState,
  type WeeklyNoteValue,
} from "@/actions/weekly-note.actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useFormRemountKey } from "@/hooks/use-form-remount-key"

const initialState: WeeklyNoteState = {}

export function WeeklyNoteForm({ note }: { note: WeeklyNoteValue }) {
  const [state, formAction, isPending] = useActionState(updateWeeklyNote, initialState)
  const formKey = useFormRemountKey(state)

  useEffect(() => {
    if (state.success) toast.success("저장되었습니다.")
  }, [state])

  return (
    <form key={formKey} action={formAction} className="flex min-h-0 flex-1 flex-col gap-2">
      <Textarea
        name="content"
        className="min-h-0 flex-1 resize-none"
        placeholder="이번 주 특이사항을 입력하세요 (주간보고에 활용)."
        defaultValue={state.values?.content ?? note.content}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {note.updatedAt ? `마지막 수정: ${format(note.updatedAt, "yyyy-MM-dd HH:mm")}` : "아직 저장된 내용이 없습니다."}
        </span>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
      {state.error && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}
    </form>
  )
}
