"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireManager } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

export type WeeklyNoteValue = {
  content: string
  updatedAt: Date | null
}

/** 주간보고용 공유 메모(싱글턴 1행)를 조회합니다. (MANAGER 이상) */
export async function getWeeklyNote(): Promise<WeeklyNoteValue> {
  await requireManager()

  const note = await prisma.weeklyNote.findFirst()
  return { content: note?.content ?? "", updatedAt: note?.updatedAt ?? null }
}

export type WeeklyNoteState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

const noteSchema = z.object({
  content: z.string().max(4000, "4000자 이내로 입력하세요."),
})

/** 주간보고용 공유 메모를 덮어씁니다(1개 행만 유지). (MANAGER 이상) */
export async function updateWeeklyNote(
  _prevState: WeeklyNoteState,
  formData: FormData
): Promise<WeeklyNoteState> {
  await requireManager()

  const values = formDataToRecord(formData)

  const parsed = noteSchema.safeParse({ content: formData.get("content") ?? "" })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.", values }
  }

  const existing = await prisma.weeklyNote.findFirst()

  try {
    if (existing) {
      await prisma.weeklyNote.update({
        where: { id: existing.id },
        data: { content: parsed.data.content },
      })
    } else {
      await prisma.weeklyNote.create({ data: { content: parsed.data.content } })
    }
  } catch (error) {
    console.error("[updateWeeklyNote]", error)
    return { error: "저장 중 오류가 발생했습니다.", values }
  }

  revalidatePath("/")
  return { success: true }
}
