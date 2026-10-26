"use server"

import { applyDueOrgSuccessions } from "@/actions/org.actions"
import {
  applyDueAssignmentAllocations,
  computeAssignmentMonthMmForPeriods,
} from "@/actions/project-assignment.actions"
import { getWorkingDayInfo, getYearWorkingDaySummary } from "@/actions/working-day.actions"
import { requireManager } from "@/lib/auth-utils"
import { calculateAvailableMm } from "@/lib/availability"
import { getEffectiveResignDate, getPlanningEffectiveResignDate } from "@/lib/employee-constants"
import { prisma } from "@/lib/prisma"
import { isIncludedInUtilization } from "@/lib/utilization-exclusion"

/** "확정" = 실제 재직/계약 상태 그대로. "계획" = 계약 연장 가정(plannedActiveUntil) +
 *  가상 인력(Placeholder) 배정을 포함해 연간 계획을 시뮬레이션합니다. */
export type UtilizationMode = "actual" | "planned"

export type UtilizationRow = {
  /** 가상 인력(Placeholder) 행이면 null. */
  employeeId: string | null
  name: string
  teamName: string
  availableMm: number
  totalMm: number
  /** availableMm - totalMm. 음수면 과투입(가용보다 많이 투입됨). */
  idleMm: number
  projectNames: string
  /** 완전 유휴(투입이 0인 경우)만 표시. 부분 유휴는 idleMm으로 확인. */
  isNoWork: boolean
  /** "계획" 모드에서 채용 예정(가상) 인력으로 합성된 행이면 true. */
  isPlaceholder?: boolean
}

/** "M/D" 형식으로 날짜를 표시합니다(UTC 기준). */
function formatMonthDay(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`
}

/** targetMonth("YYYY-MM")의 시작일/종료일(둘 다 UTC 자정)을 만듭니다. */
function monthRange(targetMonth: string): { start: Date; end: Date } {
  const [y, m] = targetMonth.split("-").map(Number)
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 0)) }
}

export type UtilizationReport = {
  rows: UtilizationRow[]
  totalCount: number
  workingCount: number
  noWorkCount: number
  /** 전사 가용 공수(M/M) 합계 */
  totalAvailableMm: number
  /** 전사 투입 공수(M/M) 합계 */
  totalInputMm: number
  /** 전사 No-work(유휴 공수, M/M) = totalAvailableMm - totalInputMm */
  noWorkMm: number
  /** totalInputMm / totalAvailableMm. 가용 공수가 0이면 null. */
  utilizationRate: number | null
}

/**
 * 특정 날짜 기준 전사 가동률 현황을 집계합니다. (ADMIN/MANAGER 전용)
 * targetDate("YYYY-MM-DD")가 속한 월의 ProjectAllocation.inputMm 합계를 구하되,
 * targetDate 시점에 재직 중이지 않은 직원(입사 전, 또는 퇴사자 — 계약만료로 나가
 * resignDate 없이 contractEndDate만 지난 경우 포함)과, 가동률 집계 대상이 아닌
 * 직원(excludedFromUtilization 및 예외 기간 반영)은 집계에서 제외합니다.
 *
 * mode="planned"("계획" 모드)이면 계약 만료 판정에 getPlanningEffectiveResignDate를
 * 대신 쓰고(plannedActiveUntil까지 가용 인력으로 간주), 가상 인력(Placeholder) 배정을
 * 합성 행으로 추가합니다 — "확정" 모드는 기존 동작과 100% 동일합니다.
 */
export async function getUtilizationReport(
  targetDate: string,
  mode: UtilizationMode = "actual",
  teamId?: string
): Promise<UtilizationReport> {
  await requireManager()
  await applyDueOrgSuccessions()
  await applyDueAssignmentAllocations()

  const asOf = new Date(targetDate)
  const targetMonth = targetDate.slice(0, 7)

  const workingDay = await getWorkingDayInfo(targetMonth)

  const employees = await prisma.employee.findMany({
    where: teamId
      ? { teamHistories: { some: { teamId, endDate: null } } }
      : undefined,
    select: {
      id: true,
      name: true,
      empType: true,
      joinDate: true,
      resignDate: true,
      contractEndDate: true,
      plannedActiveUntil: true,
      excludedFromUtilization: true,
      utilizationOverrides: true,
      teamHistories: {
        where: { endDate: null },
        take: 1,
        orderBy: { startDate: "desc" },
        select: { team: { select: { teamName: true } } },
      },
      allocations: {
        where: { targetMonth },
        select: {
          inputMm: true,
          project: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const resolveEffectiveResignDate = (employee: (typeof employees)[number]) =>
    mode === "planned"
      ? getPlanningEffectiveResignDate(employee, asOf)
      : getEffectiveResignDate(employee, asOf)

  const activeEmployees = employees.filter((employee) => {
    if (employee.joinDate > asOf) return false
    const effectiveResignDate = resolveEffectiveResignDate(employee)
    if (effectiveResignDate && effectiveResignDate < asOf) return false
    if (
      !isIncludedInUtilization(
        employee.excludedFromUtilization,
        employee.utilizationOverrides,
        asOf
      )
    ) {
      return false
    }
    return true
  })

  const rows: UtilizationRow[] = activeEmployees.map((employee) => {
    const totalMm = Math.round(
      employee.allocations.reduce((sum, allocation) => sum + allocation.inputMm, 0) * 100
    ) / 100

    const effectiveResignDate = resolveEffectiveResignDate(employee)
    const availableMm = calculateAvailableMm({
      joinDate: employee.joinDate,
      resignDate: effectiveResignDate,
      targetMonth,
      workingDays: workingDay.workingDays,
      excludedDates: workingDay.excludedWeekdays,
      isIncludedOnDay: (dayMs) =>
        isIncludedInUtilization(
          employee.excludedFromUtilization,
          employee.utilizationOverrides,
          new Date(dayMs)
        ),
    })

    return {
      employeeId: employee.id,
      name: employee.name,
      teamName: employee.teamHistories[0]?.team.teamName ?? "미배정",
      availableMm,
      totalMm,
      idleMm: Math.round((availableMm - totalMm) * 100) / 100,
      projectNames: employee.allocations.map((a) => a.project.name).join(", "),
      isNoWork: totalMm === 0,
    }
  })

  if (mode === "planned") {
    const { start: monthStart, end: monthEnd } = monthRange(targetMonth)
    const placeholders = await prisma.projectAssignment.findMany({
      where: {
        employeeId: null,
        periods: {
          some: {
            startDate: { lte: monthEnd },
            OR: [{ endDate: null }, { endDate: { gte: monthStart } }],
          },
        },
      },
      select: {
        monthlyMm: true,
        placeholderLabel: true,
        project: { select: { name: true } },
        periods: { select: { startDate: true, endDate: true } },
      },
    })

    for (const placeholder of placeholders) {
      const mm = await computeAssignmentMonthMmForPeriods(
        placeholder.periods,
        placeholder.monthlyMm,
        targetMonth
      )
      if (mm <= 0) continue
      rows.push({
        employeeId: null,
        name: placeholder.placeholderLabel ?? "채용예정",
        teamName: "-",
        availableMm: mm,
        totalMm: mm,
        idleMm: 0,
        projectNames: placeholder.project.name,
        isNoWork: false,
        isPlaceholder: true,
      })
    }
  }

  const workingCount = rows.filter((row) => !row.isNoWork).length
  const totalAvailableMm = Math.round(rows.reduce((sum, r) => sum + r.availableMm, 0) * 100) / 100
  const totalInputMm = Math.round(rows.reduce((sum, r) => sum + r.totalMm, 0) * 100) / 100

  return {
    rows,
    totalCount: rows.length,
    workingCount,
    noWorkCount: rows.length - workingCount,
    totalAvailableMm,
    totalInputMm,
    noWorkMm: Math.round((totalAvailableMm - totalInputMm) * 100) / 100,
    utilizationRate:
      totalAvailableMm > 0 ? Math.round((totalInputMm / totalAvailableMm) * 100) / 100 : null,
  }
}

export type UtilizationMonthCell = {
  targetMonth: string
  availableMm: number
  inputMm: number
  /** availableMm이 0이면 null (그 달에 재직하지 않음 → 비율 표시 불가) */
  rate: number | null
  /** 그 달 투입에 기여한 프로젝트 목록(분할 투입이면 2개 이상). 클릭 이동 대상 판단용. */
  projects: { id: string; name: string }[]
}

export type UtilizationMatrixRow = {
  /** 가상 인력(Placeholder) 행이면 null. */
  employeeId: string | null
  name: string
  teamName: string
  months: UtilizationMonthCell[]
  /** "계획" 모드에서 채용 예정(가상) 인력으로 합성된 행이면 true. */
  isPlaceholder?: boolean
}

export type UtilizationMatrix = {
  year: string
  rows: UtilizationMatrixRow[]
}

/**
 * 연도 기준 전 직원의 월별 가용공수/투입공수/투입율 매트릭스를 집계합니다. (ADMIN/MANAGER 전용)
 * 가용공수 계산은 `calculateAvailableMm` 참고 (평일 수 기반 근사치).
 *
 * mode="planned"("계획" 모드)이면 계약 만료 판정에 getPlanningEffectiveResignDate를
 * 대신 쓰고, 가상 인력(Placeholder) 배정을 연간 행으로 합성합니다 — "확정" 모드는
 * 기존 동작과 100% 동일합니다.
 */
export async function getUtilizationMatrix(
  year: string,
  mode: UtilizationMode = "actual",
  teamId?: string
): Promise<UtilizationMatrix> {
  await requireManager()
  await applyDueOrgSuccessions()
  await applyDueAssignmentAllocations()

  const [employees, monthSummaries] = await Promise.all([
    prisma.employee.findMany({
      where: teamId
        ? { teamHistories: { some: { teamId, endDate: null } } }
        : undefined,
      select: {
        id: true,
        name: true,
        empType: true,
        joinDate: true,
        resignDate: true,
        contractEndDate: true,
        plannedActiveUntil: true,
        excludedFromUtilization: true,
        utilizationOverrides: true,
        teamHistories: {
          where: { endDate: null },
          take: 1,
          orderBy: { startDate: "desc" },
          select: { team: { select: { teamName: true } } },
        },
        allocations: {
          where: { targetMonth: { startsWith: `${year}-` } },
          select: {
            targetMonth: true,
            inputMm: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    getYearWorkingDaySummary(year),
  ])

  const workingDayMap = new Map(monthSummaries.map((m) => [m.targetMonth, m]))

  const rows: UtilizationMatrixRow[] = employees.map((employee) => {
    const inputByMonth = new Map<string, number>()
    const projectsByMonth = new Map<string, { id: string; name: string }[]>()
    for (const allocation of employee.allocations) {
      inputByMonth.set(
        allocation.targetMonth,
        (inputByMonth.get(allocation.targetMonth) ?? 0) + allocation.inputMm
      )
      const projects = projectsByMonth.get(allocation.targetMonth) ?? []
      projects.push(allocation.project)
      projectsByMonth.set(allocation.targetMonth, projects)
    }

    const effectiveResignDate =
      mode === "planned" ? getPlanningEffectiveResignDate(employee) : getEffectiveResignDate(employee)

    const months: UtilizationMonthCell[] = Array.from({ length: 12 }, (_, i) => {
      const targetMonth = `${year}-${String(i + 1).padStart(2, "0")}`
      const workingDay = workingDayMap.get(targetMonth)!
      const inputMm = Math.round((inputByMonth.get(targetMonth) ?? 0) * 100) / 100

      const availableMm = calculateAvailableMm({
        joinDate: employee.joinDate,
        resignDate: effectiveResignDate,
        targetMonth,
        workingDays: workingDay.workingDays,
        excludedDates: workingDay.excludedWeekdays,
        isIncludedOnDay: (dayMs) =>
          isIncludedInUtilization(
            employee.excludedFromUtilization,
            employee.utilizationOverrides,
            new Date(dayMs)
          ),
      })

      const rate = availableMm > 0 ? Math.round((inputMm / availableMm) * 100) / 100 : null
      const projects = projectsByMonth.get(targetMonth) ?? []

      return { targetMonth, availableMm, inputMm, rate, projects }
    })

    return {
      employeeId: employee.id,
      name: employee.name,
      teamName: employee.teamHistories[0]?.team.teamName ?? "미배정",
      months,
    }
  })

  if (mode === "planned") {
    const yearStart = new Date(Date.UTC(Number(year), 0, 1))
    const yearEnd = new Date(Date.UTC(Number(year), 11, 31))
    const placeholders = await prisma.projectAssignment.findMany({
      where: {
        employeeId: null,
        periods: {
          some: {
            startDate: { lte: yearEnd },
            OR: [{ endDate: null }, { endDate: { gte: yearStart } }],
          },
        },
      },
      select: {
        monthlyMm: true,
        placeholderLabel: true,
        project: { select: { id: true, name: true } },
        periods: { select: { startDate: true, endDate: true } },
      },
    })

    for (const placeholder of placeholders) {
      const months: UtilizationMonthCell[] = []
      for (let i = 0; i < 12; i++) {
        const targetMonth = `${year}-${String(i + 1).padStart(2, "0")}`
        const mm = await computeAssignmentMonthMmForPeriods(
          placeholder.periods,
          placeholder.monthlyMm,
          targetMonth
        )
        const projects = mm > 0 ? [placeholder.project] : []
        months.push({
          targetMonth,
          availableMm: mm,
          inputMm: mm,
          rate: mm > 0 ? 1 : null,
          projects,
        })
      }

      rows.push({
        employeeId: null,
        name: placeholder.placeholderLabel ?? "채용예정",
        teamName: "-",
        months,
        isPlaceholder: true,
      })
    }
  }

  return { year, rows }
}

export type UtilizationMonthlyPerson = {
  id: string
  name: string
  idleMm?: number
  detail?: string
}

export type UtilizationYearlyMonthSummary = {
  targetMonth: string
  headcount: number
  regularCount: number
  contractCount: number
  availableMm: number
  inputMm: number
  idleMm: number
  utilizationRate: number | null
  noWorkEmployees: UtilizationMonthlyPerson[]
  newHires: UtilizationMonthlyPerson[]
  resignations: UtilizationMonthlyPerson[]
  lpRecords: UtilizationMonthlyPerson[]
}

export type UtilizationYearlySummary = {
  year: string
  months: UtilizationYearlyMonthSummary[]
  averages: {
    headcount: number
    availableMm: number
    inputMm: number
    utilizationRate: number | null
  }
}

/**
 * 연간 상단 요약(월별 충원/가용·투입 공수/가동률 + 입사·퇴사·노워크·LP 이벤트)을 집계합니다.
 * (ADMIN/MANAGER 전용) getUtilizationMatrix의 직원×월 데이터를 재사용해 전사 합계로
 * 접고, 정규직/계약직 구분(regularConversionDate 기준 월말 시점 추정) 및 입사/퇴사/LP
 * 이벤트는 별도로 조회해 덧붙입니다.
 */
export async function getUtilizationYearlySummary(
  year: string,
  mode: UtilizationMode = "actual",
  teamId?: string
): Promise<UtilizationYearlySummary> {
  await requireManager()
  await applyDueOrgSuccessions()
  await applyDueAssignmentAllocations()

  const yearStart = new Date(Date.UTC(Number(year), 0, 1))
  const yearEnd = new Date(Date.UTC(Number(year) + 1, 0, 1))

  const [matrix, employees, lpRecords] = await Promise.all([
    getUtilizationMatrix(year, mode, teamId),
    prisma.employee.findMany({
      where: teamId ? { teamHistories: { some: { teamId, endDate: null } } } : undefined,
      select: {
        id: true,
        name: true,
        empType: true,
        joinDate: true,
        resignDate: true,
        contractEndDate: true,
        plannedActiveUntil: true,
        regularConversionDate: true,
      },
    }),
    prisma.lpRecord.findMany({
      where: {
        createdAt: { gte: yearStart, lt: yearEnd },
        ...(teamId
          ? { employee: { teamHistories: { some: { teamId, endDate: null } } } }
          : {}),
      },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        employee: { select: { id: true, name: true } },
      },
    }),
  ])

  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const months: UtilizationYearlyMonthSummary[] = Array.from({ length: 12 }, (_, i) => {
    const targetMonth = `${year}-${String(i + 1).padStart(2, "0")}`
    const monthEnd = new Date(Date.UTC(Number(year), i + 1, 0))

    let availableMm = 0
    let inputMm = 0
    let regularCount = 0
    let contractCount = 0
    let placeholderCount = 0
    const noWorkEmployees: UtilizationMonthlyPerson[] = []

    for (const row of matrix.rows) {
      const cell = row.months[i]
      availableMm += cell.availableMm
      inputMm += cell.inputMm
      if (cell.availableMm <= 0) continue // 그 달에 재직(또는 배정)하지 않음

      if (row.isPlaceholder) {
        placeholderCount++
      } else if (row.employeeId) {
        const emp = employeeById.get(row.employeeId)
        const notYetConverted =
          emp?.empType === "REGULAR" &&
          emp.regularConversionDate &&
          emp.regularConversionDate > monthEnd
        const effectiveType = notYetConverted ? "CONTRACT" : emp?.empType
        if (effectiveType === "REGULAR") regularCount++
        else if (effectiveType === "CONTRACT") contractCount++
      }

      const idle = Math.round((cell.availableMm - cell.inputMm) * 100) / 100
      if (idle > 0 && row.employeeId) {
        noWorkEmployees.push({ id: row.employeeId, name: row.name, idleMm: idle })
      }
    }
    noWorkEmployees.sort((a, b) => (b.idleMm ?? 0) - (a.idleMm ?? 0))

    const newHires: UtilizationMonthlyPerson[] = []
    const resignations: UtilizationMonthlyPerson[] = []
    for (const emp of employees) {
      if (emp.joinDate.toISOString().slice(0, 7) === targetMonth) {
        newHires.push({ id: emp.id, name: emp.name, detail: formatMonthDay(emp.joinDate) })
      }
      const effectiveResignDate =
        mode === "planned" ? getPlanningEffectiveResignDate(emp) : getEffectiveResignDate(emp)
      if (effectiveResignDate && effectiveResignDate.toISOString().slice(0, 7) === targetMonth) {
        resignations.push({
          id: emp.id,
          name: emp.name,
          detail: formatMonthDay(effectiveResignDate),
        })
      }
    }

    const monthLp: UtilizationMonthlyPerson[] = lpRecords
      .filter((r) => r.createdAt.toISOString().slice(0, 7) === targetMonth)
      .map((r) => ({ id: r.employee.id, name: r.employee.name, detail: r.reason }))

    const roundedAvailableMm = Math.round(availableMm * 100) / 100
    const roundedInputMm = Math.round(inputMm * 100) / 100

    return {
      targetMonth,
      headcount: regularCount + contractCount + placeholderCount,
      regularCount,
      contractCount,
      availableMm: roundedAvailableMm,
      inputMm: roundedInputMm,
      idleMm: Math.round((roundedAvailableMm - roundedInputMm) * 100) / 100,
      utilizationRate:
        roundedAvailableMm > 0
          ? Math.round((roundedInputMm / roundedAvailableMm) * 100) / 100
          : null,
      noWorkEmployees,
      newHires,
      resignations,
      lpRecords: monthLp,
    }
  })

  const avgHeadcount = Math.round(months.reduce((s, m) => s + m.headcount, 0) / 12)
  const avgAvailableMm = Math.round((months.reduce((s, m) => s + m.availableMm, 0) / 12) * 100) / 100
  const avgInputMm = Math.round((months.reduce((s, m) => s + m.inputMm, 0) / 12) * 100) / 100

  return {
    year,
    months,
    averages: {
      headcount: avgHeadcount,
      availableMm: avgAvailableMm,
      inputMm: avgInputMm,
      utilizationRate:
        avgAvailableMm > 0 ? Math.round((avgInputMm / avgAvailableMm) * 100) / 100 : null,
    },
  }
}
