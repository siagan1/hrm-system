"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireManager } from "@/lib/auth-utils"
import { suggestGrade } from "@/lib/grade"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

/** 등급 기준(GradeCriterion) 목록을 조회합니다. (ADMIN/MANAGER 전용) */
export async function getGradeCriteria() {
  await requireManager()

  return prisma.gradeCriterion.findMany({
    orderBy: { requiredMonths: "asc" },
  })
}

/** 특정 직원의 현재 등급 정보를 조회합니다. (ADMIN/MANAGER 전용) */
export async function getEmployeeGrade(employeeId: string) {
  await requireManager()

  return prisma.employeeGrade.findUnique({
    where: { employeeId },
  })
}

export type EmployeeGradeProfile = {
  eduOptionId: string | null
  certOptionId: string | null
  expMonths: number
}

/** 직원의 학력/자격증 선택값 + 경력(개월)을 조회합니다. (ADMIN/MANAGER 전용) */
export async function getEmployeeGradeProfile(
  employeeId: string
): Promise<EmployeeGradeProfile> {
  await requireManager()

  const grade = await prisma.employeeGrade.findUnique({
    where: { employeeId },
    select: { eduOptionId: true, certOptionId: true, expMonths: true },
  })

  return {
    eduOptionId: grade?.eduOptionId ?? null,
    certOptionId: grade?.certOptionId ?? null,
    expMonths: grade?.expMonths ?? 0,
  }
}

export type GradeProfileState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

/** Select의 "선택 안 함" 항목은 빈 문자열을 쓸 수 없어 사용하는 센티널 값. */
const NONE_OPTION_VALUE = "__none__"

function readOptionId(formData: FormData, field: string): string | undefined {
  const raw = formData.get(field)
  if (!raw || raw === NONE_OPTION_VALUE) return undefined
  return String(raw)
}

const gradeProfileSchema = z.object({
  employeeId: z.string().min(1),
  eduOptionId: z.string().optional(),
  certOptionId: z.string().optional(),
  expMonths: z.coerce.number().int().min(0, "0 이상의 값을 입력하세요."),
})

/**
 * 직원의 학력/자격증(각 1개 선택) + 경력(개월)을 저장합니다. (ADMIN/MANAGER 전용)
 * eduMonths/certMonths는 선택한 옵션의 months 값을 서버에서 그대로 가져와 저장하고,
 * totalMonths를 재계산합니다. currentGrade는 여기서 건드리지 않습니다(등급관리 탭에서 별도 저장).
 */
export async function updateEmployeeGradeProfile(
  _prevState: GradeProfileState,
  formData: FormData
): Promise<GradeProfileState> {
  await requireManager()

  const values = formDataToRecord(formData)

  const parsed = gradeProfileSchema.safeParse({
    employeeId: formData.get("employeeId"),
    eduOptionId: readOptionId(formData, "eduOptionId"),
    certOptionId: readOptionId(formData, "certOptionId"),
    expMonths: formData.get("expMonths"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { employeeId, eduOptionId, certOptionId, expMonths } = parsed.data

  const [eduOption, certOption] = await Promise.all([
    eduOptionId
      ? prisma.gradeOption.findUnique({ where: { id: eduOptionId } })
      : null,
    certOptionId
      ? prisma.gradeOption.findUnique({ where: { id: certOptionId } })
      : null,
  ])

  if (eduOptionId && eduOption?.category !== "EDUCATION") {
    return { error: "학력 선택값이 올바르지 않습니다.", values }
  }
  if (certOptionId && certOption?.category !== "CERTIFICATE") {
    return { error: "자격증 선택값이 올바르지 않습니다.", values }
  }

  const eduMonths = eduOption?.months ?? 0
  const certMonths = certOption?.months ?? 0
  const totalMonths = eduMonths + certMonths + expMonths

  try {
    const existing = await prisma.employeeGrade.findUnique({ where: { employeeId } })

    if (existing) {
      await prisma.employeeGrade.update({
        where: { employeeId },
        data: {
          eduOptionId: eduOptionId ?? null,
          certOptionId: certOptionId ?? null,
          eduMonths,
          certMonths,
          expMonths,
          totalMonths,
        },
      })
    } else {
      const criteria = await prisma.gradeCriterion.findMany()
      const defaultGrade = suggestGrade(totalMonths, criteria) ?? "초급"

      await prisma.employeeGrade.create({
        data: {
          employeeId,
          eduOptionId: eduOptionId ?? null,
          certOptionId: certOptionId ?? null,
          eduMonths,
          certMonths,
          expMonths,
          totalMonths,
          currentGrade: defaultGrade,
        },
      })
    }
  } catch (error) {
    console.error("[updateEmployeeGradeProfile]", error)
    return { error: "저장 중 오류가 발생했습니다.", values }
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}

const upsertGradeSchema = z.object({
  employeeId: z.string().min(1),
  currentGrade: z.string().min(1, "등급을 선택하세요."),
})

export type UpsertGradeState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

/**
 * 직원의 등급(currentGrade)을 저장합니다. (ADMIN/MANAGER 전용)
 * 학력/자격증/경력 환산개월수는 기본정보 탭(updateEmployeeGradeProfile)에서 관리하므로
 * 여기서는 건드리지 않고, 최초 등록 시에만 0으로 기본 생성합니다.
 */
export async function upsertEmployeeGrade(
  _prevState: UpsertGradeState,
  formData: FormData
): Promise<UpsertGradeState> {
  await requireManager()

  const values = formDataToRecord(formData)

  const parsed = upsertGradeSchema.safeParse({
    employeeId: formData.get("employeeId"),
    currentGrade: formData.get("currentGrade"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { employeeId, currentGrade } = parsed.data

  try {
    await prisma.employeeGrade.upsert({
      where: { employeeId },
      update: { currentGrade },
      create: { employeeId, currentGrade },
    })
  } catch (error) {
    console.error("[upsertEmployeeGrade]", error)
    return { error: "등급 저장 중 오류가 발생했습니다.", values }
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}
