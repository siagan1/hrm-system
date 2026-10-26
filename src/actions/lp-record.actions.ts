"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { LpRecord } from "@/generated/prisma/client"
import { requireManager } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

export type LpRecordWithRegisteredBy = LpRecord & {
  registeredByEmail: string | null
}

/** 특정 직원의 LP(성과개선) 이력을 조회합니다. (ADMIN/MANAGER 전용) */
export async function getLpRecords(
  employeeId: string
): Promise<LpRecordWithRegisteredBy[]> {
  await requireManager()

  const records = await prisma.lpRecord.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  })

  const registeredByIds = [...new Set(records.map((r) => r.registeredBy))]
  const users = await prisma.user.findMany({
    where: { id: { in: registeredByIds } },
    select: { id: true, email: true },
  })
  const emailById = new Map(users.map((u) => [u.id, u.email]))

  return records.map((record) => ({
    ...record,
    registeredByEmail: emailById.get(record.registeredBy) ?? null,
  }))
}

const createLpRecordSchema = z.object({
  employeeId: z.string().min(1),
  reason: z.string().min(1, "지정 사유를 입력하세요."),
  actionPlan: z.string().min(1, "향후 조치 계획을 입력하세요."),
})

export type CreateLpRecordState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

/**
 * LP 레코드를 등록합니다. (ADMIN/MANAGER 전용)
 * registeredBy에는 현재 로그인한 사용자의 id가 자동으로 들어갑니다.
 */
export async function createLpRecord(
  _prevState: CreateLpRecordState,
  formData: FormData
): Promise<CreateLpRecordState> {
  const currentUser = await requireManager()

  const values = formDataToRecord(formData)

  const parsed = createLpRecordSchema.safeParse({
    employeeId: formData.get("employeeId"),
    reason: formData.get("reason"),
    actionPlan: formData.get("actionPlan"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { employeeId, reason, actionPlan } = parsed.data

  try {
    await prisma.lpRecord.create({
      data: {
        employeeId,
        reason,
        actionPlan,
        registeredBy: currentUser.id,
      },
    })
  } catch (error) {
    console.error("[createLpRecord]", error)
    return { error: "LP 등록 중 오류가 발생했습니다.", values }
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}
