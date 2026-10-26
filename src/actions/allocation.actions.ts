"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { applyDueAssignmentAllocations } from "@/actions/project-assignment.actions"
import { getWorkingDayInfo } from "@/actions/working-day.actions"
import { requireManager, requireUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

/** 프로젝트의 투입 인원 목록을 직원 정보와 함께 조회합니다. */
export async function getProjectAllocations(projectId: string) {
  await requireUser()
  await applyDueAssignmentAllocations()

  return prisma.projectAllocation.findMany({
    where: { projectId },
    select: {
      id: true,
      targetMonth: true,
      inputMm: true,
      isManualMm: true,
      createdAt: true,
      employee: {
        select: { id: true, name: true, grade: { select: { currentGrade: true } } },
      },
    },
    orderBy: [{ targetMonth: "desc" }, { employee: { name: "asc" } }],
  })
}

export type ProjectAllocationWithEmployee = Awaited<
  ReturnType<typeof getProjectAllocations>
>[number]

/**
 * 여러 프로젝트(상위 프로젝트 + 그 하위 프로젝트들)의 투입 인원을 한 번에 조회합니다.
 * 상위 프로젝트 상세의 "전체 투입 인원"(조회 전용) 탭에서 씁니다 — 각 행에 어느
 * 프로젝트에서 투입됐는지(project)를 같이 담아, 한 직원이 같은 달에 여러 프로젝트로
 * 나뉘어 투입된 경우도 구분할 수 있게 합니다.
 */
export async function getAggregatedProjectAllocations(projectIds: string[]) {
  await requireUser()
  await applyDueAssignmentAllocations()

  return prisma.projectAllocation.findMany({
    where: { projectId: { in: projectIds } },
    select: {
      id: true,
      targetMonth: true,
      inputMm: true,
      isManualMm: true,
      employee: { select: { id: true, name: true, grade: { select: { currentGrade: true } } } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ targetMonth: "desc" }, { employee: { name: "asc" } }],
  })
}

export type AggregatedAllocation = Awaited<
  ReturnType<typeof getAggregatedProjectAllocations>
>[number]

const allocationSchema = z
  .object({
    employeeId: z.string().min(1, "직원을 선택하세요."),
    projectId: z.string().min(1),
    targetMonth: z
      .string()
      .regex(
        /^\d{4}-(0[1-9]|1[0-2])$/,
        "YYYY-MM 형식으로 입력하세요 (예: 2026-08)."
      ),
    mode: z.enum(["auto", "manual"]),
    inputDays: z.string().optional(),
    manualMm: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "auto") {
      const days = Number(data.inputDays)
      if (!data.inputDays || Number.isNaN(days) || days < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "투입 일수를 0 이상의 숫자로 입력하세요.",
          path: ["inputDays"],
        })
      }
    } else {
      const mm = Number(data.manualMm)
      if (!data.manualMm || Number.isNaN(mm) || mm < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "투입 MM을 0 이상의 숫자로 입력하세요.",
          path: ["manualMm"],
        })
      }
    }
  })

export type AllocationState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

/**
 * 프로젝트에 인원을 투입(할당)합니다. (ADMIN/MANAGER 전용)
 * 동일 (직원, 프로젝트, 대상월) 조합이 이미 있으면 값을 갱신합니다 (Upsert).
 *
 * - 자동 산출 모드: 투입 일수 ÷ 해당 월 WorkingDay.workingDays → 소수점 둘째 자리 반올림
 * - 수동 입력 모드: 입력한 MM을 그대로 저장하고 isManualMm=true
 */
export async function upsertAllocation(
  _prevState: AllocationState,
  formData: FormData
): Promise<AllocationState> {
  await requireManager()

  const values = formDataToRecord(formData)

  const parsed = allocationSchema.safeParse({
    employeeId: formData.get("employeeId"),
    projectId: formData.get("projectId"),
    targetMonth: formData.get("targetMonth"),
    mode: formData.get("mode"),
    inputDays: formData.get("inputDays") || undefined,
    manualMm: formData.get("manualMm") || undefined,
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { employeeId, projectId, targetMonth, mode } = parsed.data

  let inputMm: number
  let isManualMm: boolean

  if (mode === "auto") {
    const workingDay = await getWorkingDayInfo(targetMonth)

    if (workingDay.workingDays <= 0) {
      return {
        error: "해당 월의 근무일수가 0입니다. 워킹데이 정보를 확인하세요.",
        values,
      }
    }

    const inputDays = Number(parsed.data.inputDays)
    inputMm = Math.round((inputDays / workingDay.workingDays) * 100) / 100
    isManualMm = false
  } else {
    inputMm = Math.round(Number(parsed.data.manualMm) * 100) / 100
    isManualMm = true
  }

  try {
    await prisma.projectAllocation.upsert({
      where: {
        employeeId_projectId_targetMonth: {
          employeeId,
          projectId,
          targetMonth,
        },
      },
      update: { inputMm, isManualMm },
      create: { employeeId, projectId, targetMonth, inputMm, isManualMm },
    })
  } catch (error) {
    console.error("[upsertAllocation]", error)
    return { error: "투입 인원 저장 중 오류가 발생했습니다.", values }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

/** 투입 인원 배정을 삭제합니다. (ADMIN/MANAGER 전용) */
export async function deleteAllocation(
  allocationId: string,
  projectId: string
): Promise<void> {
  await requireManager()

  await prisma.projectAllocation.delete({ where: { id: allocationId } })

  revalidatePath(`/projects/${projectId}`)
}

/**
 * 이 프로젝트에서 특정 직원의 투입 기록을 연도 구분 없이 전부 삭제합니다. (ADMIN/MANAGER 전용)
 * 매트릭스에서 "이 사람을 이 프로젝트에서 빼는" 용도 — 개별 달만 지우려면 deleteAllocation을 쓰세요.
 * 이 직원에게 진행 중인 배정 기간(ProjectAssignment)이 남아있다면, 나중에 그 배정을 수정할 때
 * 해당 달들이 다시 자동 생성될 수 있습니다(별도로 배정 기간도 정리해야 완전히 제거됩니다).
 */
export async function deleteEmployeeAllocations(
  employeeId: string,
  projectId: string
): Promise<void> {
  await requireManager()

  await prisma.projectAllocation.deleteMany({ where: { employeeId, projectId } })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/employees/${employeeId}`)
}
