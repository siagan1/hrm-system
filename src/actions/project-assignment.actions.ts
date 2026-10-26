"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getWorkingDayInfo } from "@/actions/working-day.actions"
import { requireManager, requireUser } from "@/lib/auth-utils"
import { calculateAvailableMm } from "@/lib/availability"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

/** start~end(둘 다 포함) 사이의 "YYYY-MM" 목록을 오름차순으로 만듭니다. */
function monthsBetweenInclusive(start: Date, end: Date): string[] {
  const months: string[] = []
  let y = start.getUTCFullYear()
  let m = start.getUTCMonth()
  const endY = end.getUTCFullYear()
  const endM = end.getUTCMonth()

  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m + 1).padStart(2, "0")}`)
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }
  return months
}

export type PeriodInput = { startDate: Date; endDate: Date | null }

/** 여러 구간의 대상월을 합집합으로 만듭니다(중복 제거, 오름차순). */
function monthsForPeriods(periods: PeriodInput[]): string[] {
  const months = new Set<string>()
  for (const period of periods) {
    for (const month of monthsBetweenInclusive(period.startDate, period.endDate ?? new Date())) {
      months.add(month)
    }
  }
  return [...months].sort()
}

/**
 * 구간들을 시작일 기준 정렬해 서로 겹치는지 검사합니다. 겹치면 에러 메시지를, 아니면 null을 반환합니다.
 */
function findOverlappingPeriodsError(periods: PeriodInput[]): string | null {
  const sorted = [...periods].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev.endDate === null || curr.startDate <= prev.endDate) {
      return "배정 구간이 서로 겹칩니다. 겹치지 않게 입력하세요."
    }
  }
  return null
}

/**
 * 배정 기간(startDate~endDate) 대비 그 달에 며칠이나 걸치는지를 calculateAvailableMm로
 * 계산해(0~1 비율) monthlyMm에 곱합니다. 새로운 일할계산 로직을 만들지 않고 재사용합니다.
 * 직원 유무와 무관한 순수 기간 계산이라 가상 배정(placeholder) 계산에도 그대로 씁니다.
 */
export async function computeAssignmentMonthMm(
  startDate: Date,
  endDate: Date | null,
  monthlyMm: number,
  targetMonth: string
): Promise<number> {
  const workingDay = await getWorkingDayInfo(targetMonth)
  const ratio = calculateAvailableMm({
    joinDate: startDate,
    resignDate: endDate,
    targetMonth,
    workingDays: workingDay.workingDays,
    excludedDates: workingDay.excludedWeekdays,
  })
  return Math.round(monthlyMm * ratio * 100) / 100
}

/**
 * 배정의 여러 구간을 합쳐 그 달의 몫을 계산합니다. 구간별 몫을 단순 합산하되,
 * 혹시 구간이 겹쳐 있어도(검증에서 걸러지지만 방어적으로) monthlyMm을 넘지 않게 clamp합니다.
 */
export async function computeAssignmentMonthMmForPeriods(
  periods: PeriodInput[],
  monthlyMm: number,
  targetMonth: string
): Promise<number> {
  let total = 0
  for (const period of periods) {
    total += await computeAssignmentMonthMm(period.startDate, period.endDate, monthlyMm, targetMonth)
  }
  return Math.min(monthlyMm, Math.round(total * 100) / 100)
}

/** 프로젝트의 배정 목록을 직원 정보 및 구간 목록과 함께 조회합니다. */
export async function getProjectAssignments(projectId: string) {
  await requireUser()
  await applyDueAssignmentAllocations()

  return prisma.projectAssignment.findMany({
    where: { projectId },
    include: {
      employee: { select: { id: true, name: true, grade: { select: { currentGrade: true } } } },
      periods: { orderBy: { startDate: "asc" } },
    },
    orderBy: [{ createdAt: "desc" }],
  })
}

export type ProjectAssignmentWithEmployee = Awaited<
  ReturnType<typeof getProjectAssignments>
>[number]

/** 직원의 배정 목록을 프로젝트 정보 및 구간 목록과 함께 조회합니다. */
export async function getEmployeeAssignments(employeeId: string) {
  await requireUser()
  await applyDueAssignmentAllocations()

  return prisma.projectAssignment.findMany({
    where: { employeeId },
    include: {
      project: { select: { id: true, name: true, projectCode: true } },
      periods: { orderBy: { startDate: "asc" } },
    },
    orderBy: [{ createdAt: "desc" }],
  })
}

export type ProjectAssignmentWithProject = Awaited<
  ReturnType<typeof getEmployeeAssignments>
>[number]

export type EmployeeProjectMonthCell = { targetMonth: string; inputMm: number }
export type EmployeeProjectRow = {
  projectId: string
  projectName: string
  projectCode: string | null
  months: EmployeeProjectMonthCell[]
  totalMm: number
}

/** 직원 상세의 "투입 프로젝트" 탭용 — 그 직원의 그 연도 투입을 프로젝트별 월별 그리드로 묶습니다. */
export async function getEmployeeAssignmentMatrix(
  employeeId: string,
  year: string
): Promise<EmployeeProjectRow[]> {
  await requireUser()
  await applyDueAssignmentAllocations()

  const allocations = await prisma.projectAllocation.findMany({
    where: { employeeId, targetMonth: { startsWith: `${year}-` } },
    include: { project: { select: { id: true, name: true, projectCode: true } } },
    orderBy: { targetMonth: "asc" },
  })

  const rowMap = new Map<string, EmployeeProjectRow>()
  for (const allocation of allocations) {
    let row = rowMap.get(allocation.projectId)
    if (!row) {
      row = {
        projectId: allocation.projectId,
        projectName: allocation.project.name,
        projectCode: allocation.project.projectCode,
        months: [],
        totalMm: 0,
      }
      rowMap.set(allocation.projectId, row)
    }
    row.months.push({ targetMonth: allocation.targetMonth, inputMm: allocation.inputMm })
    row.totalMm = Math.round((row.totalMm + allocation.inputMm) * 100) / 100
  }

  return [...rowMap.values()].sort((a, b) => a.projectName.localeCompare(b.projectName, "ko"))
}

export type ProjectAssignmentState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

const periodInputSchema = z.object({
  startDate: z.string().min(1, "시작일을 선택하세요."),
  endDate: z.string().optional(),
})
const periodsArraySchema = z.array(periodInputSchema).min(1, "배정 기간을 1개 이상 입력하세요.")

/**
 * hidden input(name="periods")에 JSON으로 담긴 구간 목록을 파싱·검증합니다.
 * 시작일<=종료일(구간별), 구간끼리 겹치지 않는지까지 여기서 확인합니다.
 */
function parsePeriodsField(
  formData: FormData
): { periods: PeriodInput[] } | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get("periods") ?? "[]"))
  } catch {
    return { error: "배정 기간 목록 형식이 올바르지 않습니다." }
  }

  const result = periodsArraySchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "배정 기간을 확인하세요." }
  }

  const periods: PeriodInput[] = []
  for (const p of result.data) {
    const start = new Date(p.startDate)
    const end = p.endDate ? new Date(p.endDate) : null
    if (end && start > end) {
      return { error: "시작일이 종료일보다 늦을 수 없습니다." }
    }
    periods.push({ startDate: start, endDate: end })
  }

  const overlapError = findOverlappingPeriodsError(periods)
  if (overlapError) return { error: overlapError }

  return { periods }
}

const createAssignmentSchema = z
  .object({
    isPlaceholder: z.string().optional(),
    employeeId: z.string().optional(),
    placeholderLabel: z.string().optional(),
    placeholderGrade: z.string().optional(),
    projectId: z.string().min(1),
    monthlyMm: z.coerce
      .number()
      .min(0, "0 이상의 값을 입력하세요.")
      .max(2, "월 비율은 2 이하로 입력하세요."),
  })
  .refine(
    (data) =>
      data.isPlaceholder === "on"
        ? !!data.placeholderLabel && !!data.placeholderGrade
        : !!data.employeeId,
    {
      message: "직원을 선택하거나, 가상 인력의 설명/등급을 입력하세요.",
      path: ["employeeId"],
    }
  )

/**
 * 프로젝트 배정을 등록합니다. (ADMIN/MANAGER 전용)
 * 배정 1건은 여러 구간(기간)을 가질 수 있으며, 각 구간에 해당하는 달의 ProjectAllocation을
 * 자동 생성합니다(이미 수동 수정된 달은 건너뜀). 다른 프로젝트 배정과 합쳐 어떤 달이
 * 1.0MM을 초과하면 저장 자체를 거부합니다.
 * 가상 인력(채용예정) 배정은 ProjectAllocation을 전혀 건드리지 않습니다 — "실제" 투입
 * 데이터는 순수하게 유지하고, 가동률 "계획" 모드 조회 시점에만 계산에 포함됩니다.
 */
export async function createProjectAssignment(
  _prevState: ProjectAssignmentState,
  formData: FormData
): Promise<ProjectAssignmentState> {
  await requireManager()

  const values = formDataToRecord(formData)
  const parsed = createAssignmentSchema.safeParse({
    isPlaceholder: formData.get("isPlaceholder") || undefined,
    employeeId: formData.get("employeeId") || undefined,
    placeholderLabel: formData.get("placeholderLabel") || undefined,
    placeholderGrade: formData.get("placeholderGrade") || undefined,
    projectId: formData.get("projectId"),
    monthlyMm: formData.get("monthlyMm"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.", values }
  }

  const periodsResult = parsePeriodsField(formData)
  if ("error" in periodsResult) {
    return { error: periodsResult.error, values }
  }
  const { periods } = periodsResult

  const { projectId, monthlyMm } = parsed.data
  const isPlaceholder = parsed.data.isPlaceholder === "on"

  if (isPlaceholder) {
    try {
      await prisma.projectAssignment.create({
        data: {
          projectId,
          monthlyMm,
          placeholderLabel: parsed.data.placeholderLabel,
          placeholderGrade: parsed.data.placeholderGrade,
          periods: { create: periods.map((p) => ({ startDate: p.startDate, endDate: p.endDate })) },
        },
      })
    } catch (error) {
      console.error("[createProjectAssignment]", error)
      return { error: "배정 등록 중 오류가 발생했습니다.", values }
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  }

  const employeeId = parsed.data.employeeId!
  const months = monthsForPeriods(periods)

  const existingForProject = await prisma.projectAllocation.findMany({
    where: { employeeId, projectId, targetMonth: { in: months } },
  })
  const existingByMonth = new Map(existingForProject.map((a) => [a.targetMonth, a]))

  const overLimitMonths: string[] = []
  const toWrite: { targetMonth: string; inputMm: number }[] = []

  for (const targetMonth of months) {
    if (existingByMonth.get(targetMonth)?.isManualMm) continue

    const inputMm = await computeAssignmentMonthMmForPeriods(periods, monthlyMm, targetMonth)
    toWrite.push({ targetMonth, inputMm })

    const others = await prisma.projectAllocation.aggregate({
      where: { employeeId, targetMonth, projectId: { not: projectId } },
      _sum: { inputMm: true },
    })
    const projected = Math.round(((others._sum.inputMm ?? 0) + inputMm) * 100) / 100
    if (projected > 1) {
      overLimitMonths.push(`${targetMonth}(${projected}MM)`)
    }
  }

  if (overLimitMonths.length > 0) {
    return {
      error: `다른 프로젝트 배정과 합쳐 다음 달에 1.0MM을 초과합니다: ${overLimitMonths.join(", ")}`,
      values,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.projectAssignment.create({
        data: {
          employeeId,
          projectId,
          monthlyMm,
          periods: { create: periods.map((p) => ({ startDate: p.startDate, endDate: p.endDate })) },
        },
      })
      for (const { targetMonth, inputMm } of toWrite) {
        await tx.projectAllocation.upsert({
          where: { employeeId_projectId_targetMonth: { employeeId, projectId, targetMonth } },
          update: { inputMm, isManualMm: false },
          create: { employeeId, projectId, targetMonth, inputMm, isManualMm: false },
        })
      }
    })
  } catch (error) {
    console.error("[createProjectAssignment]", error)
    return { error: "배정 등록 중 오류가 발생했습니다.", values }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}

const updateAssignmentSchema = z.object({
  id: z.string().min(1),
  monthlyMm: z.coerce
    .number()
    .min(0, "0 이상의 값을 입력하세요.")
    .max(2, "월 비율은 2 이하로 입력하세요."),
})

/**
 * 배정을 수정합니다. (ADMIN/MANAGER 전용)
 * 구간 목록은 통째로 새 목록으로 교체합니다(개별 구간을 참조하는 다른 테이블이 없어 안전).
 * 새로 포함된 달은 생성/갱신(수동 제외), 범위에서 빠진 달은 비수동 행만 삭제합니다.
 */
export async function updateProjectAssignment(
  _prevState: ProjectAssignmentState,
  formData: FormData
): Promise<ProjectAssignmentState> {
  await requireManager()

  const values = formDataToRecord(formData)
  const parsed = updateAssignmentSchema.safeParse({
    id: formData.get("id"),
    monthlyMm: formData.get("monthlyMm"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.", values }
  }

  const periodsResult = parsePeriodsField(formData)
  if ("error" in periodsResult) {
    return { error: periodsResult.error, values }
  }
  const { periods: newPeriods } = periodsResult

  const existing = await prisma.projectAssignment.findUnique({
    where: { id: parsed.data.id },
    include: { periods: true },
  })
  if (!existing) {
    return { error: "배정을 찾을 수 없습니다.", values }
  }

  const { employeeId, projectId } = existing

  if (!employeeId) {
    // 가상 인력(채용예정) 배정 — ProjectAllocation이 애초에 없으므로 구간/월비율만 갱신합니다.
    try {
      await prisma.$transaction(async (tx) => {
        await tx.projectAssignment.update({
          where: { id: existing.id },
          data: { monthlyMm: parsed.data.monthlyMm },
        })
        await tx.projectAssignmentPeriod.deleteMany({ where: { assignmentId: existing.id } })
        await tx.projectAssignmentPeriod.createMany({
          data: newPeriods.map((p) => ({
            assignmentId: existing.id,
            startDate: p.startDate,
            endDate: p.endDate,
          })),
        })
      })
    } catch (error) {
      console.error("[updateProjectAssignment]", error)
      return { error: "배정 수정 중 오류가 발생했습니다.", values }
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  }

  const newMonths = monthsForPeriods(newPeriods)

  const existingForProject = await prisma.projectAllocation.findMany({
    where: { employeeId, projectId, targetMonth: { in: newMonths } },
  })
  const existingByMonth = new Map(existingForProject.map((a) => [a.targetMonth, a]))

  const overLimitMonths: string[] = []
  const toWrite: { targetMonth: string; inputMm: number }[] = []

  for (const targetMonth of newMonths) {
    if (existingByMonth.get(targetMonth)?.isManualMm) continue

    const inputMm = await computeAssignmentMonthMmForPeriods(newPeriods, parsed.data.monthlyMm, targetMonth)
    toWrite.push({ targetMonth, inputMm })

    const others = await prisma.projectAllocation.aggregate({
      where: { employeeId, targetMonth, projectId: { not: projectId } },
      _sum: { inputMm: true },
    })
    const projected = Math.round(((others._sum.inputMm ?? 0) + inputMm) * 100) / 100
    if (projected > 1) {
      overLimitMonths.push(`${targetMonth}(${projected}MM)`)
    }
  }

  if (overLimitMonths.length > 0) {
    return {
      error: `다른 프로젝트 배정과 합쳐 다음 달에 1.0MM을 초과합니다: ${overLimitMonths.join(", ")}`,
      values,
    }
  }

  // newMonths 밖의 비수동 행은 전부 제거 대상입니다. 과거 구간 기록(oldMonths)과 비교하는
  // 대신 DB에 실제로 남아있는 행을 직접 조회합니다 — open-ended 구간을 "오늘"로 어림잡아
  // oldMonths를 구하면, 그 사이 시점이 바뀌며 생긴 미래 달의 낡은 행을 영영 못 찾게 됩니다.
  const removableRows = await prisma.projectAllocation.findMany({
    where: {
      employeeId,
      projectId,
      targetMonth: { notIn: newMonths },
      isManualMm: false,
    },
  })

  try {
    await prisma.$transaction(async (tx) => {
      await tx.projectAssignment.update({
        where: { id: existing.id },
        data: { monthlyMm: parsed.data.monthlyMm },
      })
      await tx.projectAssignmentPeriod.deleteMany({ where: { assignmentId: existing.id } })
      await tx.projectAssignmentPeriod.createMany({
        data: newPeriods.map((p) => ({
          assignmentId: existing.id,
          startDate: p.startDate,
          endDate: p.endDate,
        })),
      })
      for (const row of removableRows) {
        await tx.projectAllocation.delete({ where: { id: row.id } })
      }
      for (const { targetMonth, inputMm } of toWrite) {
        await tx.projectAllocation.upsert({
          where: { employeeId_projectId_targetMonth: { employeeId, projectId, targetMonth } },
          update: { inputMm, isManualMm: false },
          create: { employeeId, projectId, targetMonth, inputMm, isManualMm: false },
        })
      }
    })
  } catch (error) {
    console.error("[updateProjectAssignment]", error)
    return { error: "배정 수정 중 오류가 발생했습니다.", values }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}

/**
 * 배정 기간을 삭제합니다. (ADMIN/MANAGER 전용)
 * 같은 직원·프로젝트로 남아있는 다른 배정이 커버하지 못하는 달의 비수동(isManualMm:false)
 * ProjectAllocation을 같이 삭제합니다. monthsForPeriods(existing.periods)만 보고 지우면
 * open-ended 구간을 "오늘"로 어림잡아 계산했던 과거 시점의 낡은 행(지금의 달 범위 밖에
 * 남은 스트레이 행)을 놓치므로, 남아있는 배정들 기준으로 "지금 커버되는 달"을 다시 구해
 * 그 밖의 비수동 행을 전부 정리합니다.
 */
export async function deleteProjectAssignment(
  id: string,
  projectId: string
): Promise<void> {
  await requireManager()

  const existing = await prisma.projectAssignment.findUnique({
    where: { id },
    include: { periods: true },
  })
  if (!existing) return

  const { employeeId } = existing

  let stillCoveredMonths: string[] = []
  if (employeeId) {
    const otherAssignments = await prisma.projectAssignment.findMany({
      where: { employeeId, projectId: existing.projectId, id: { not: id } },
      include: { periods: true },
    })
    stillCoveredMonths = monthsForPeriods(otherAssignments.flatMap((a) => a.periods))
  }

  await prisma.$transaction(async (tx) => {
    if (employeeId) {
      await tx.projectAllocation.deleteMany({
        where: {
          employeeId,
          projectId: existing.projectId,
          targetMonth: { notIn: stillCoveredMonths },
          isManualMm: false,
        },
      })
    }
    // periods는 onDelete: Cascade로 함께 삭제됩니다.
    await tx.projectAssignment.delete({ where: { id } })
  })

  revalidatePath(`/projects/${projectId}`)
  if (employeeId) {
    revalidatePath(`/employees/${employeeId}`)
  }
}

/**
 * 진행 중(구간 중 endDate: null인 것이 있는) 배정에 대해, 이번 달 ProjectAllocation이 아직
 * 없으면 자동으로 생성합니다. applyDueRegularConversions()/applyDueOrgSuccessions()와 같은
 * "지연 반영·자가 치유" 패턴 — 별도 크론 없이 읽기 시점마다 호출해 최신 상태를 보장합니다.
 */
export async function applyDueAssignmentAllocations(): Promise<void> {
  const today = new Date()
  const currentMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`

  const ongoing = await prisma.projectAssignment.findMany({
    where: { employeeId: { not: null }, periods: { some: { endDate: null } } },
    include: { periods: true },
  })

  for (const assignment of ongoing) {
    if (!assignment.employeeId) continue
    const openPeriod = assignment.periods.find((p) => p.endDate === null)
    if (!openPeriod || openPeriod.startDate > today) continue

    const existing = await prisma.projectAllocation.findUnique({
      where: {
        employeeId_projectId_targetMonth: {
          employeeId: assignment.employeeId,
          projectId: assignment.projectId,
          targetMonth: currentMonth,
        },
      },
    })
    if (existing) continue

    const inputMm = await computeAssignmentMonthMmForPeriods(
      assignment.periods,
      assignment.monthlyMm,
      currentMonth
    )
    if (inputMm <= 0) continue

    await prisma.projectAllocation.create({
      data: {
        employeeId: assignment.employeeId,
        projectId: assignment.projectId,
        targetMonth: currentMonth,
        inputMm,
        isManualMm: false,
      },
    })
  }
}
