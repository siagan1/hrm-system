"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { z } from "zod"

import type { Role } from "@/generated/prisma/client"
import { requireAdmin } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

const VALID_ROLES: Role[] = ["ADMIN", "MANAGER", "USER"]

/** 전체 계정 목록을 연결된 직원 정보와 함께 조회합니다. (ADMIN 전용) */
export async function getUsers() {
  await requireAdmin()

  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      employee: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  })
}

/**
 * 계정의 권한(role)을 변경합니다. (ADMIN 전용)
 * 안전장치: 본인 권한은 이 화면에서 바꿀 수 없고, 마지막 남은 ADMIN은 강등할 수 없습니다.
 */
export async function updateUserRole(
  targetUserId: string,
  role: string
): Promise<{ error?: string }> {
  const currentUser = await requireAdmin()

  if (!VALID_ROLES.includes(role as Role)) {
    return { error: "올바르지 않은 권한 값입니다." }
  }

  if (targetUserId === currentUser.id) {
    return { error: "본인의 권한은 이 화면에서 변경할 수 없습니다." }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  })
  if (!targetUser) {
    return { error: "대상 계정을 찾을 수 없습니다." }
  }

  if (targetUser.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
    if (adminCount <= 1) {
      return {
        error: "마지막 남은 ADMIN 계정의 권한은 강등할 수 없습니다.",
      }
    }
  }

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: role as Role },
    })
  } catch (error) {
    console.error("[updateUserRole]", error)
    return { error: "권한 변경 중 오류가 발생했습니다." }
  }

  revalidatePath("/users")
  return {}
}

/** 로그인 계정이 없는 직원 목록입니다. "HRM 사용 권한 부여" 시 직원 선택지로 씁니다. (ADMIN 전용) */
export async function getUnlinkedEmployeeOptions() {
  await requireAdmin()

  return prisma.employee.findMany({
    where: { userId: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
}

export type CreateUserState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

const createUserSchema = z.object({
  employeeId: z.string().min(1, "직원을 선택하세요."),
  email: z.string().email("올바른 이메일을 입력하세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  role: z.enum(["ADMIN", "MANAGER", "USER"]),
})

/**
 * 선택한 직원에게 HRM 로그인 권한을 부여합니다. (ADMIN 전용)
 * 로그인 ID는 직원의 회사 이메일을 기본값으로 쓰되, 없거나 다르면 직접 입력한 값으로 저장/갱신합니다.
 */
export async function createUserAccount(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  await requireAdmin()

  const values = formDataToRecord(formData)

  const parsed = createUserSchema.safeParse({
    employeeId: formData.get("employeeId"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { employeeId, email, password, role } = parsed.data

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true, email: true },
  })
  if (!employee) {
    return { error: "선택한 직원을 찾을 수 없습니다.", values }
  }
  if (employee.userId) {
    return { error: "이미 로그인 계정이 있는 직원입니다.", values }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { error: "이미 사용 중인 이메일입니다.", values }
  }
  if (employee.email && employee.email !== email) {
    const emailTaken = await prisma.employee.findUnique({
      where: { email },
      select: { id: true },
    })
    if (emailTaken) {
      return { error: "이미 다른 직원이 사용 중인 이메일입니다.", values }
    }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, role },
      })

      await tx.employee.update({
        where: { id: employeeId },
        data: { userId: user.id, email },
      })
    })
  } catch (error) {
    console.error("[createUserAccount]", error)
    return { error: "권한 부여 중 오류가 발생했습니다.", values }
  }

  revalidatePath("/users")
  revalidatePath("/employees")
  return { success: true }
}

/**
 * 로그인 계정을 삭제합니다. (ADMIN 전용)
 * 연결된 직원 기록은 삭제하지 않고, 로그인 연결만 해제합니다.
 * 안전장치: 본인 계정, 마지막 남은 ADMIN 계정은 삭제할 수 없습니다.
 */
export async function deleteUserAccount(
  targetUserId: string
): Promise<{ error?: string }> {
  const currentUser = await requireAdmin()

  if (targetUserId === currentUser.id) {
    return { error: "본인 계정은 삭제할 수 없습니다." }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true, employee: { select: { id: true } } },
  })
  if (!targetUser) {
    return { error: "대상 계정을 찾을 수 없습니다." }
  }

  if (targetUser.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
    if (adminCount <= 1) {
      return { error: "마지막 남은 ADMIN 계정은 삭제할 수 없습니다." }
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (targetUser.employee) {
        await tx.employee.update({
          where: { id: targetUser.employee.id },
          data: { userId: null },
        })
      }
      await tx.user.delete({ where: { id: targetUserId } })
    })
  } catch (error) {
    console.error("[deleteUserAccount]", error)
    return { error: "계정 삭제 중 오류가 발생했습니다." }
  }

  revalidatePath("/users")
  return {}
}
