"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { z } from "zod"

import { applyDueOrgSuccessions } from "@/actions/org.actions"
import type { Prisma } from "@/generated/prisma/client"
import { requireAdmin, requireUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

const employeeWithCurrentTeamArgs = {
  include: {
    teamHistories: {
      where: { endDate: null },
      take: 1,
      orderBy: { startDate: "desc" },
      include: { team: true },
    },
    grade: { select: { currentGrade: true } },
  },
} satisfies Prisma.EmployeeDefaultArgs

export type EmployeeWithCurrentTeam = Prisma.EmployeeGetPayload<
  typeof employeeWithCurrentTeamArgs
>

export type EmployeeFilters = {
  name?: string
  teamId?: string
  empType?: string
  page?: number
  pageSize?: number
}

export type EmployeeListResult = {
  rows: EmployeeWithCurrentTeam[]
  totalCount: number
}

/**
 * 정규직 전환 예정일(regularConversionDate)이 지난 계약직 직원을 정규직으로 일괄 전환합니다.
 * 별도 배치/크론이 없는 환경이라, 직원 데이터를 조회하는 시점마다 호출해 최신 상태를 보장합니다(지연 반영이지만 자가 치유됨).
 */
export async function applyDueRegularConversions(): Promise<void> {
  await prisma.employee.updateMany({
    where: {
      empType: "CONTRACT",
      regularConversionDate: { lte: new Date() },
    },
    data: { empType: "REGULAR" },
  })
}

/** 직원 목록을 현재 소속 팀 정보와 함께 조회합니다. 이름/소속팀/구분으로 필터링할 수 있습니다. */
export async function getEmployees(
  filters: EmployeeFilters = {}
): Promise<EmployeeListResult> {
  await requireUser()
  await applyDueRegularConversions()
  await applyDueOrgSuccessions()

  const { name, teamId, empType } = filters
  const page = filters.page && filters.page > 0 ? filters.page : 1
  const pageSize = filters.pageSize ?? 20

  const today = new Date()
  // getEmploymentStatusLabel/getEffectiveResignDate(employee-constants.ts)와 동일한 "퇴사자" 판정 기준.
  const resignedWhere: Prisma.EmployeeWhereInput = {
    OR: [
      { resignDate: { lte: today } },
      {
        AND: [
          { resignDate: null },
          { empType: "CONTRACT" },
          { contractEndDate: { lt: today } },
        ],
      },
    ],
  }

  let statusWhere: Prisma.EmployeeWhereInput = {}
  if (empType === "RESIGNED") {
    statusWhere = resignedWhere
  } else if (empType === "REGULAR" || empType === "CONTRACT") {
    statusWhere = { empType, NOT: resignedWhere }
  }

  const where: Prisma.EmployeeWhereInput = {
    ...(name ? { name: { contains: name } } : {}),
    ...statusWhere,
    ...(teamId
      ? { teamHistories: { some: { teamId, endDate: null } } }
      : {}),
  }

  const [rows, totalCount] = await Promise.all([
    prisma.employee.findMany({
      ...employeeWithCurrentTeamArgs,
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ])

  return { rows, totalCount }
}

/** Select 드롭다운 등에 사용할 경량 직원 목록(id, name)만 조회합니다. */
export async function getEmployeeOptions() {
  await requireUser()

  return prisma.employee.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

/** Select의 "선택 안 함" 항목은 빈 문자열을 쓸 수 없어 사용하는 센티널 값. */
const NONE_TEAM_VALUE = "__none__"

function readTeamId(formData: FormData): string | undefined {
  const raw = formData.get("teamId")
  if (!raw || raw === NONE_TEAM_VALUE) return undefined
  return String(raw)
}

// 로그인 계정은 선택사항입니다 — 이 시스템은 팀장/관리자 등 일부만 로그인해서 쓰고,
// 대부분의 직원은 인사 데이터로만 존재합니다(Employee.userId가 null일 수 있음).
// 이메일/비밀번호 중 하나라도 입력했다면 로그인 계정을 만들겠다는 의도로 보고 둘 다 요구합니다.
const createEmployeeSchema = z
  .object({
    email: z.string().optional(),
    password: z.string().optional(),
    name: z.string().min(1, "이름을 입력하세요."),
    empType: z.string().min(1, "구분을 선택하세요."),
    joinDate: z.string().min(1, "입사일을 선택하세요."),
    // CEO 등 조직도 밖에서 관리하는 인원은 소속 팀 없이 등록할 수 있어야 해서 선택사항입니다.
    teamId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const email = data.email?.trim()
    const password = data.password
    const wantsAccount = !!email || !!password

    if (!wantsAccount) return

    if (!email || !z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "올바른 이메일을 입력하세요.",
        path: ["email"],
      })
    }
    if (!password || password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "비밀번호는 8자 이상이어야 합니다.",
        path: ["password"],
      })
    }
  })

export type CreateEmployeeState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

/**
 * 직원을 등록합니다. (ADMIN 전용)
 * User 계정 생성 + Employee 생성 + 최초 EmployeeTeamHistory INSERT를 하나의 트랜잭션으로 처리합니다.
 */
export async function createEmployee(
  _prevState: CreateEmployeeState,
  formData: FormData
): Promise<CreateEmployeeState> {
  await requireAdmin()

  const values = formDataToRecord(formData)

  const parsed = createEmployeeSchema.safeParse({
    email: formData.get("email") || undefined,
    password: formData.get("password") || undefined,
    name: formData.get("name"),
    empType: formData.get("empType"),
    joinDate: formData.get("joinDate"),
    teamId: readTeamId(formData),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { email, password, name, empType, joinDate, teamId } = parsed.data
  const wantsAccount = !!email

  if (wantsAccount) {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return { error: "이미 사용 중인 이메일입니다.", values }
    }
  }

  const passwordHash = wantsAccount ? await bcrypt.hash(password!, 10) : null
  const today = new Date()

  try {
    await prisma.$transaction(async (tx) => {
      const user = wantsAccount
        ? await tx.user.create({
            data: { email: email!, passwordHash: passwordHash!, role: "USER" },
          })
        : null

      const employee = await tx.employee.create({
        data: {
          userId: user?.id,
          name,
          empType,
          joinDate: new Date(joinDate),
        },
      })

      if (teamId) {
        await tx.employeeTeamHistory.create({
          data: {
            employeeId: employee.id,
            teamId,
            startDate: today,
            endDate: null,
          },
        })
      }
    })
  } catch (error) {
    console.error("[createEmployee]", error)
    return { error: "직원 등록 중 오류가 발생했습니다.", values }
  }

  revalidatePath("/employees")
  return { success: true }
}

const employeeDetailArgs = {
  include: {
    user: { select: { email: true } },
    teamHistories: {
      orderBy: { startDate: "desc" },
      include: { team: true },
    },
  },
} satisfies Prisma.EmployeeDefaultArgs

export type EmployeeDetail = Prisma.EmployeeGetPayload<typeof employeeDetailArgs>

/** 직원의 기본 정보 + 전체 조직 이력을 조회합니다. */
export async function getEmployeeBasic(
  employeeId: string
): Promise<EmployeeDetail | null> {
  await requireUser()
  await applyDueRegularConversions()
  await applyDueOrgSuccessions()

  return prisma.employee.findUnique({
    where: { id: employeeId },
    ...employeeDetailArgs,
  })
}

const updateEmployeeBasicSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1, "이름을 입력하세요."),
  empType: z.string().min(1, "구분을 선택하세요."),
  joinDate: z.string().min(1, "입사일을 선택하세요."),
  resignDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  plannedActiveUntil: z.string().optional(),
  regularConversionDate: z.string().optional(),
  isExecutive: z.coerce.boolean().optional(),
})

export type UpdateEmployeeBasicState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

/** 직원의 기본 정보를 수정합니다. (ADMIN 전용) */
export async function updateEmployeeBasic(
  _prevState: UpdateEmployeeBasicState,
  formData: FormData
): Promise<UpdateEmployeeBasicState> {
  await requireAdmin()

  const values = formDataToRecord(formData)

  const parsed = updateEmployeeBasicSchema.safeParse({
    employeeId: formData.get("employeeId"),
    name: formData.get("name"),
    empType: formData.get("empType"),
    joinDate: formData.get("joinDate"),
    resignDate: formData.get("resignDate") || undefined,
    contractEndDate: formData.get("contractEndDate") || undefined,
    plannedActiveUntil: formData.get("plannedActiveUntil") || undefined,
    regularConversionDate: formData.get("regularConversionDate") || undefined,
    isExecutive: formData.get("isExecutive") || undefined,
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const {
    employeeId,
    name,
    empType,
    joinDate,
    resignDate,
    contractEndDate,
    plannedActiveUntil,
    regularConversionDate,
    isExecutive,
  } = parsed.data

  try {
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        name,
        empType,
        joinDate: new Date(joinDate),
        resignDate: resignDate ? new Date(resignDate) : null,
        contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
        plannedActiveUntil: plannedActiveUntil ? new Date(plannedActiveUntil) : null,
        regularConversionDate: regularConversionDate
          ? new Date(regularConversionDate)
          : null,
        isExecutive: isExecutive ?? false,
        // 임원으로 켜면 가동률 제외 대상도 같이 설정합니다(끌 때는 건드리지 않음 —
        // 팀장 등 다른 이유로 별도 설정된 가동률 제외를 되돌리지 않기 위함).
        ...(isExecutive ? { excludedFromUtilization: true } : {}),
      },
    })
    // 방금 입력한 전환일이 이미 지난 날짜라면(과거 날짜 입력 등) 바로 반영합니다.
    await applyDueRegularConversions()
  } catch (error) {
    console.error("[updateEmployeeBasic]", error)
    return { error: "직원 정보 수정 중 오류가 발생했습니다.", values }
  }

  revalidatePath(`/employees/${employeeId}`)
  revalidatePath("/employees")
  revalidatePath("/utilization")
  revalidatePath("/")
  return { success: true }
}

/**
 * 직원을 삭제합니다. (ADMIN 전용)
 * 투입(MM)/배정/LP 기록처럼 실제 업무 이력이 있으면 삭제를 막습니다(프로젝트 삭제와
 * 동일한 원칙) — 실제로 퇴사한 직원이라면 삭제 대신 "퇴사일"을 입력하세요. 이력이
 * 없는 경우(잘못 등록한 경우 등)에만 조직 이력/등급/가동률 예외/자격증과 로그인 계정을
 * 함께 정리합니다.
 */
export async function deleteEmployee(employeeId: string): Promise<{ error?: string }> {
  await requireAdmin()

  const [allocationCount, assignmentCount, lpCount, employee] = await Promise.all([
    prisma.projectAllocation.count({ where: { employeeId } }),
    prisma.projectAssignment.count({ where: { employeeId } }),
    prisma.lpRecord.count({ where: { employeeId } }),
    prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } }),
  ])

  if (!employee) {
    return { error: "존재하지 않는 직원입니다." }
  }
  if (allocationCount > 0) {
    return {
      error: `투입(MM) 데이터가 ${allocationCount}건 있어 삭제할 수 없습니다. 실제 퇴사자라면 '퇴사일'을 입력해주세요.`,
    }
  }
  if (assignmentCount > 0) {
    return {
      error: `프로젝트 배정 이력이 ${assignmentCount}건 있어 삭제할 수 없습니다. 실제 퇴사자라면 '퇴사일'을 입력해주세요.`,
    }
  }
  if (lpCount > 0) {
    return {
      error: `LP(성과개선) 기록이 ${lpCount}건 있어 삭제할 수 없습니다. 실제 퇴사자라면 '퇴사일'을 입력해주세요.`,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.employeeTeamHistory.deleteMany({ where: { employeeId } })
      await tx.employeeGrade.deleteMany({ where: { employeeId } })
      await tx.employeeUtilizationOverride.deleteMany({ where: { employeeId } })
      await tx.employeeCertification.deleteMany({ where: { employeeId } })
      await tx.employee.delete({ where: { id: employeeId } })
      if (employee.userId) {
        await tx.dashboardSetting.deleteMany({ where: { userId: employee.userId } })
        await tx.user.delete({ where: { id: employee.userId } })
      }
    })
  } catch (error) {
    console.error("[deleteEmployee]", error)
    return { error: "직원 삭제 중 오류가 발생했습니다." }
  }

  revalidatePath("/employees")
  return {}
}

/**
 * 직원의 소속 팀을 변경합니다. (ADMIN 전용, SCD Type 2)
 * 1) 현재 소속(endDate가 null인 EmployeeTeamHistory)의 endDate를 오늘로 마감
 * 2) 새 소속 팀으로 startDate가 오늘이고 endDate가 null인 레코드를 새로 INSERT
 */
export async function changeEmployeeTeam(
  employeeId: string,
  newTeamId: string
): Promise<void> {
  await requireAdmin()

  if (!employeeId || !newTeamId) {
    throw new Error("employeeId와 newTeamId는 필수입니다.")
  }

  await prisma.$transaction(async (tx) => {
    const currentHistory = await tx.employeeTeamHistory.findFirst({
      where: { employeeId, endDate: null },
      orderBy: { startDate: "desc" },
    })

    if (currentHistory?.teamId === newTeamId) {
      return
    }

    const today = new Date()

    if (currentHistory) {
      await tx.employeeTeamHistory.update({
        where: { id: currentHistory.id },
        data: { endDate: today },
      })
    }

    await tx.employeeTeamHistory.create({
      data: {
        employeeId,
        teamId: newTeamId,
        startDate: today,
        endDate: null,
      },
    })
  })

  revalidatePath("/employees")
  revalidatePath(`/employees/${employeeId}`)
}
