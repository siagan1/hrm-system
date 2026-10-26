import { getWeeklyNote } from "@/actions/weekly-note.actions"
import { WeeklyNoteForm } from "@/components/dashboard/widgets/weekly-note-form"

export async function WeeklyNoteWidget() {
  const note = await getWeeklyNote()

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="font-semibold">이번 주 특이사항</h2>
      <WeeklyNoteForm note={note} />
    </div>
  )
}
