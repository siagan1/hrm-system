"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { EmployeeUtilizationOverride } from "@/generated/prisma/client"
import { requireAdmin, requireManager } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

export type UtilizationExclusionSettings = {
  excludedFromUtilization: boolean
  overrides: EmployeeUtilizationOverride[]
}

/** 직원의 가동률 제외 설정(기본 상태 + 예외 기간)을 조회합니다. (ADMIN/MANAGER 전용) */
export async function getUtilizationExclusion(
  employeeId: string
): Promise<UtilizationExclusionSettings> {
  await requireManager()

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { excludedFromUtilization: true },
  })

  const overrides = await prisma.employeeUtilizationOverride.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  })

  return {
    excludedFromUtilization: employee?.excludedFromUtilization ?? false,
    overrides,
  }
}

/** 직원의 가동률 기본 상태(기본 포함/기본 제외)를 변경합니다. (ADMIN 전용) */
export async function updateExcludedFromUtilization(
  employeeId: string,
  excluded: boolean
): Promise<void> {
  await requireAdmin()

  await prisma.employee.update({
    where: { id: employeeId },
    data: { excludedFromUtilization: excluded },
  })

  revalidatePath(`/employees/${employeeId}`)
  revalidatePath("/utilization")
}

const createOverrideSchema = z
  .object({
    employeeId: z.string().min(1),
    mode: z.enum(["INCLUDE", "EXCLUDE"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    reason: z.string().optional(),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    { message: "시작일은 종료일보다 늦을 수 없습니다.", path: ["endDate"] }
  )

export type CreateOverrideState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

/**
 * 가동률 예외 기간을 등록합니다. (ADMIN 전용)
 * 기본 상태(excludedFromUtilization)와 반대되는 기간을 지정하는 용도입니다.
 * 시작일/종료일을 비우면 각각 "처음부터"/"계속"을 의미합니다.
 */
export async function createUtilizationOverride(
  _prevState: CreateOverrideState,
  formData: FormData
): Promise<CreateOverrideState> {
  await requireAdmin()

  const values = formDataToRecord(formData)

  const parsed = createOverrideSchema.safeParse({
    employeeId: formData.get("employeeId"),
    mode: formData.get("mode"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    reason: formData.get("reason") || undefined,
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { employeeId, mode, startDate, endDate, reason } = parsed.data

  try {
    await prisma.employeeUtilizationOverride.create({
      data: {
        employeeId,
        mode,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        reason: reason || null,
      },
    })
  } catch (error) {
    console.error("[createUtilizationOverride]", error)
    return { error: "예외 기간 등록 중 오류가 발생했습니다.", values }
  }

  revalidatePath(`/employees/${employeeId}`)
  revalidatePath("/utilization")
  return { success: true }
}

/** 가동률 예외 기간을 삭제합니다. (ADMIN 전용) */
export async function deleteUtilizationOverride(
  overrideId: string,
  employeeId: string
): Promise<void> {
  await requireAdmin()

  await prisma.employeeUtilizationOverride.delete({ where: { id: overrideId } })

  revalidatePath(`/employees/${employeeId}`)
  revalidatePath("/utilization")
}
