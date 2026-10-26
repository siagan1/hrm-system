"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { EmployeeCertification } from "@/generated/prisma/client"
import { requireManager } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

/** 특정 직원이 보유한 자격증 목록을 취득일 최신순으로 조회합니다. (ADMIN/MANAGER 전용) */
export async function getCertifications(
  employeeId: string
): Promise<EmployeeCertification[]> {
  await requireManager()

  return prisma.employeeCertification.findMany({
    where: { employeeId },
    orderBy: { acquiredDate: "desc" },
  })
}

const createCertificationSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1, "자격증명을 입력하세요."),
  acquiredDate: z.string().min(1, "취득일을 선택하세요."),
})

export type CreateCertificationState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

/** 직원의 보유 자격증을 등록합니다. (ADMIN/MANAGER 전용) */
export async function createCertification(
  _prevState: CreateCertificationState,
  formData: FormData
): Promise<CreateCertificationState> {
  await requireManager()

  const values = formDataToRecord(formData)

  const parsed = createCertificationSchema.safeParse({
    employeeId: formData.get("employeeId"),
    name: formData.get("name"),
    acquiredDate: formData.get("acquiredDate"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { employeeId, name, acquiredDate } = parsed.data

  try {
    await prisma.employeeCertification.create({
      data: { employeeId, name, acquiredDate: new Date(acquiredDate) },
    })
  } catch (error) {
    console.error("[createCertification]", error)
    return { error: "자격증 등록 중 오류가 발생했습니다.", values }
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}

/** 자격증 1건을 삭제합니다. (ADMIN/MANAGER 전용) */
export async function deleteCertification(
  certificationId: string,
  employeeId: string
): Promise<void> {
  await requireManager()

  await prisma.employeeCertification.delete({ where: { id: certificationId } })

  revalidatePath(`/employees/${employeeId}`)
}
