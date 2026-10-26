"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin, requireManager } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

export type NotificationSettingValues = {
  regularConversionLeadMonths: number
  contractExtensionLeadMonths: number
  gradeUpgradeLeadMonths: number
}

const DEFAULT_SETTING: NotificationSettingValues = {
  regularConversionLeadMonths: 1,
  contractExtensionLeadMonths: 1,
  gradeUpgradeLeadMonths: 1,
}

/** 알림 생성 기준(싱글턴)을 조회합니다. 없으면 기본값을 반환합니다. (MANAGER 이상 조회 가능) */
export async function getNotificationSetting(): Promise<NotificationSettingValues> {
  await requireManager()

  const setting = await prisma.notificationSetting.findFirst()
  if (!setting) return DEFAULT_SETTING

  return {
    regularConversionLeadMonths: setting.regularConversionLeadMonths,
    contractExtensionLeadMonths: setting.contractExtensionLeadMonths,
    gradeUpgradeLeadMonths: setting.gradeUpgradeLeadMonths,
  }
}

export type NotificationSettingState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

const settingSchema = z.object({
  regularConversionLeadMonths: z.coerce.number().int().min(0).max(24),
  contractExtensionLeadMonths: z.coerce.number().int().min(0).max(24),
  gradeUpgradeLeadMonths: z.coerce.number().int().min(0).max(24),
})

/** 알림 생성 기준(싱글턴)을 저장합니다. (ADMIN 전용) */
export async function updateNotificationSetting(
  _prevState: NotificationSettingState,
  formData: FormData
): Promise<NotificationSettingState> {
  await requireAdmin()

  const values = formDataToRecord(formData)

  const parsed = settingSchema.safeParse({
    regularConversionLeadMonths: formData.get("regularConversionLeadMonths"),
    contractExtensionLeadMonths: formData.get("contractExtensionLeadMonths"),
    gradeUpgradeLeadMonths: formData.get("gradeUpgradeLeadMonths"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const existing = await prisma.notificationSetting.findFirst()

  try {
    if (existing) {
      await prisma.notificationSetting.update({
        where: { id: existing.id },
        data: parsed.data,
      })
    } else {
      await prisma.notificationSetting.create({ data: parsed.data })
    }
  } catch (error) {
    console.error("[updateNotificationSetting]", error)
    return { error: "저장 중 오류가 발생했습니다.", values }
  }

  revalidatePath("/notification-settings")
  return { success: true }
}

export type UtilizationTargetItem = {
  id: string
  year: string
  targetRate: number
}

/** 연도별 가동률 목표치 목록을 최신 연도 순으로 조회합니다. (MANAGER 이상 조회 가능) */
export async function getUtilizationTargets(): Promise<UtilizationTargetItem[]> {
  await requireManager()

  return prisma.utilizationYearlyTarget.findMany({
    orderBy: { year: "desc" },
  })
}

export type UtilizationTargetState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

const targetSchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, "연도는 4자리 숫자로 입력하세요 (예: 2026)."),
  targetRatePercent: z.coerce
    .number()
    .min(0, "0 이상의 값을 입력하세요.")
    .max(200, "200 이하의 값을 입력하세요."),
})

/** 특정 연도의 가동률 목표치를 저장(upsert)합니다. (ADMIN 전용) targetRatePercent는 95 같은 % 단위 값입니다. */
export async function upsertUtilizationTarget(
  _prevState: UtilizationTargetState,
  formData: FormData
): Promise<UtilizationTargetState> {
  await requireAdmin()

  const values = formDataToRecord(formData)

  const parsed = targetSchema.safeParse({
    year: formData.get("year"),
    targetRatePercent: formData.get("targetRatePercent"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { year, targetRatePercent } = parsed.data
  const targetRate = Math.round((targetRatePercent / 100) * 10000) / 10000

  try {
    await prisma.utilizationYearlyTarget.upsert({
      where: { year },
      update: { targetRate },
      create: { year, targetRate },
    })
  } catch (error) {
    console.error("[upsertUtilizationTarget]", error)
    return { error: "저장 중 오류가 발생했습니다.", values }
  }

  revalidatePath("/notification-settings")
  revalidatePath("/")
  return { success: true }
}

/** 특정 연도의 가동률 목표치를 삭제합니다. (ADMIN 전용) */
export async function deleteUtilizationTarget(id: string): Promise<void> {
  await requireAdmin()

  await prisma.utilizationYearlyTarget.delete({ where: { id } })

  revalidatePath("/notification-settings")
  revalidatePath("/")
}
