"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin, requireManager } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

/** 등급 산정용 학력/자격증 옵션 목록을 조회합니다. (ADMIN/MANAGER 전용) */
export async function getGradeOptions() {
  await requireManager()

  return prisma.gradeOption.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  })
}

export type GradeOptionState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

/** 등급 기준(GradeCriterion)은 초급→특급 순으로 개월수가 커져야 합니다 (suggestGrade가 이 순서를 전제로 합니다). */
const GRADE_ORDER = ["초급", "중급", "고급", "특급"]

/**
 * 학력/자격증 옵션의 인정개월수 + 등급 기준(초급/중급/고급/특급)의 필요개월수를
 * 한 번에 저장합니다. (ADMIN 전용)
 * 항목(라벨/등급명) 자체는 고정 목록이라 추가/삭제 없이 개월수 값만 갱신합니다.
 */
export async function updateGradeOptions(
  _prevState: GradeOptionState,
  formData: FormData
): Promise<GradeOptionState> {
  await requireAdmin()

  const values = formDataToRecord(formData)
  const options = await prisma.gradeOption.findMany({ select: { id: true } })

  const optionUpdates: { id: string; months: number }[] = []
  for (const option of options) {
    const raw = formData.get(`months_${option.id}`)
    const parsed = z.coerce.number().int().min(0).safeParse(raw)
    if (!parsed.success) {
      return { error: "인정 개월수는 0 이상의 정수여야 합니다.", values }
    }
    optionUpdates.push({ id: option.id, months: parsed.data })
  }

  const criteria = await prisma.gradeCriterion.findMany()
  const criteriaByName = new Map(criteria.map((c) => [c.gradeName, c]))

  const criterionUpdates: { id: string; requiredMonths: number }[] = []
  let prevMonths = -1
  for (const gradeName of GRADE_ORDER) {
    const criterion = criteriaByName.get(gradeName)
    if (!criterion) continue

    const raw = formData.get(`requiredMonths_${criterion.id}`)
    const parsed = z.coerce.number().int().min(0).safeParse(raw)
    if (!parsed.success) {
      return { error: "등급 기준 개월수는 0 이상의 정수여야 합니다.", values }
    }
    if (parsed.data < prevMonths) {
      return {
        error: "등급 기준 개월수는 초급→특급 순으로 커지거나 같아야 합니다.",
        values,
      }
    }
    prevMonths = parsed.data
    criterionUpdates.push({ id: criterion.id, requiredMonths: parsed.data })
  }

  try {
    await prisma.$transaction([
      ...optionUpdates.map((u) =>
        prisma.gradeOption.update({ where: { id: u.id }, data: { months: u.months } })
      ),
      ...criterionUpdates.map((u) =>
        prisma.gradeCriterion.update({
          where: { id: u.id },
          data: { requiredMonths: u.requiredMonths },
        })
      ),
    ])
  } catch (error) {
    console.error("[updateGradeOptions]", error)
    return { error: "저장 중 오류가 발생했습니다." }
  }

  revalidatePath("/grade-options")
  return { success: true }
}
