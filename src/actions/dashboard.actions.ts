"use server"

import { revalidatePath } from "next/cache"

import { format } from "date-fns"

import { applyDueRegularConversions } from "@/actions/employee.actions"
import {
  getUtilizationMatrix,
  getUtilizationReport,
  getUtilizationYearlySummary,
} from "@/actions/utilization.actions"
import { isManagerOrAbove, requireManager, requireUser } from "@/lib/auth-utils"
import { DEFAULT_DASHBOARD_LAYOUT, type WidgetLayoutItem } from "@/lib/dashboard-defaults"
import { getEffectiveResignDate } from "@/lib/employee-constants"
import { prisma } from "@/lib/prisma"
import { WIDGET_CATALOG_MAP } from "@/lib/widget-catalog"

/** 현재 로그인한 사용자의 대시보드 위젯 배치를 조회합니다. 없으면 기본 배치를 반환합니다. */
export async function getUserDashboardLayout(): Promise<WidgetLayoutItem[]> {
  const user = await requireUser()

  const setting = await prisma.dashboardSetting.findUnique({
    where: { userId: user.id },
  })

  if (!setting) return DEFAULT_DASHBOARD_LAYOUT

  const layoutData = setting.layoutData
  if (
    Array.isArray(layoutData) &&
    layoutData.every(
      (item) =>
        item &&
        typeof item === "object" &&
        "i" in item &&
        "x" in item &&
        "y" in item &&
        "w" in item &&
        "h" in item
    )
  ) {
    return layoutData as WidgetLayoutItem[]
  }

  return DEFAULT_DASHBOARD_LAYOUT
}

/** 현재 로그인한 사용자의 대시보드 위젯 배치를 저장합니다. (Upsert) */
export async function saveUserDashboardLayout(
  layoutData: string
): Promise<{ error?: string }> {
  const user = await requireUser()

  let parsed: unknown
  try {
    parsed = JSON.parse(layoutData)
  } catch {
    return { error: "레이아웃 데이터 형식이 올바르지 않습니다." }
  }

  if (!Array.isArray(parsed)) {
    return { error: "레이아웃 데이터 형식이 올바르지 않습니다." }
  }

  try {
    await prisma.dashboardSetting.upsert({
      where: { userId: user.id },
      update: { layoutData: parsed },
      create: { userId: user.id, layoutData: parsed },
    })
  } catch (error) {
    console.error("[saveUserDashboardLayout]", error)
    return { error: "레이아웃 저장 중 오류가 발생했습니다." }
  }

  revalidatePath("/")
  return {}
}

/**
 * 위젯 카탈로그에서 고른 위젯 하나를 사용자의 레이아웃 맨 아래(x=0)에 기본 크기로
 * 추가해 저장합니다. 이미 추가돼 있으면 아무 것도 하지 않습니다. (위젯 추가 피커 전용)
 */
export async function addWidgetToDashboardLayout(
  widgetId: string
): Promise<{ error?: string; layout?: WidgetLayoutItem[] }> {
  const user = await requireUser()

  const catalogItem = WIDGET_CATALOG_MAP[widgetId]
  if (!catalogItem) {
    return { error: "존재하지 않는 위젯입니다." }
  }
  if (catalogItem.requiresManager && !(await isManagerOrAbove())) {
    return { error: "이 위젯을 추가할 권한이 없습니다." }
  }

  const currentLayout = await getUserDashboardLayout()
  if (currentLayout.some((item) => item.i === widgetId)) {
    return { layout: currentLayout }
  }

  const nextY = currentLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0)
  const nextLayout: WidgetLayoutItem[] = [
    ...currentLayout,
    { i: widgetId, x: 0, y: nextY, w: catalogItem.defaultSize.w, h: catalogItem.defaultSize.h },
  ]

  try {
    await prisma.dashboardSetting.upsert({
      where: { userId: user.id },
      update: { layoutData: nextLayout },
      create: { userId: user.id, layoutData: nextLayout },
    })
  } catch (error) {
    console.error("[addWidgetToDashboardLayout]", error)
    return { error: "위젯 추가 중 오류가 발생했습니다." }
  }

  revalidatePath("/")
  return { layout: nextLayout }
}

export type HeadcountSummary = {
  totalCount: number
  availableCount: number
}

/**
 * [Widget A] 현재 기준 전사 인원 요약을 조회합니다.
 * - totalCount: 재직 중인 전 인원(CEO 등 조직도 밖 임원 포함).
 * - availableCount: totalCount 중 가동률 집계 대상(excludedFromUtilization: false)인 인원.
 */
export async function getHeadcountSummary(): Promise<HeadcountSummary> {
  await requireUser()
  await applyDueRegularConversions()

  const today = new Date()
  const employees = await prisma.employee.findMany({
    select: {
      joinDate: true,
      empType: true,
      resignDate: true,
      contractEndDate: true,
      excludedFromUtilization: true,
    },
  })

  // 퇴사자/입사 전 인원은 "전사 인원 요약"에서 제외합니다(가동률 집계 제외자는 포함).
  const activeEmployees = employees.filter((employee) => {
    if (employee.joinDate > today) return false
    const effectiveResignDate = getEffectiveResignDate(employee, today)
    return !effectiveResignDate || effectiveResignDate > today
  })

  const totalCount = activeEmployees.length
  const availableCount = activeEmployees.filter(
    (employee) => !employee.excludedFromUtilization
  ).length

  return {
    totalCount,
    availableCount,
  }
}

export type ProjectMmSummary = {
  id: string
  name: string
  contractMm: number | null
  inputMm: number
}

/** [Widget B] 프로젝트별 계약 MM 대비 누적 투입 MM을 조회합니다. (최근 시작한 프로젝트 10건) */
export async function getProjectMmSummary(): Promise<ProjectMmSummary[]> {
  await requireUser()

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      totalContractMm: true,
      allocations: { select: { inputMm: true } },
    },
    orderBy: { startDate: "desc" },
    take: 10,
  })

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    contractMm: project.totalContractMm,
    inputMm:
      Math.round(
        project.allocations.reduce((sum, a) => sum + a.inputMm, 0) * 100
      ) / 100,
  }))
}

export type RecentLpRecord = {
  id: string
  employeeName: string
  reason: string
  createdAt: Date
}

/** [Widget D] 최근 3개월 내 등록된 LP 기록을 조회합니다. (ADMIN/MANAGER 전용) */
export async function getRecentLpRecords(): Promise<RecentLpRecord[]> {
  await requireManager()

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const records = await prisma.lpRecord.findMany({
    where: { createdAt: { gte: threeMonthsAgo } },
    select: {
      id: true,
      reason: true,
      createdAt: true,
      employee: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return records.map((record) => ({
    id: record.id,
    employeeName: record.employee.name,
    reason: record.reason,
    createdAt: record.createdAt,
  }))
}

/** Widget D 렌더링 전 권한을 미리 확인할 때 사용합니다. (에러를 던지지 않는 boolean 체크) */
export async function canViewLpWidget(): Promise<boolean> {
  return isManagerOrAbove()
}

export type UtilizationTrendPoint = {
  targetMonth: string
  utilizationRate: number | null
  belowTarget: boolean
}

export type DashboardUtilizationTrend = {
  year: string
  targetRate: number | null
  /** 연평균 가동률(연간 투입 공수 ÷ 연간 가용 공수). /utilization의 "평균 가동률"과 같은 값입니다. */
  yearlyRate: number | null
  currentMonthIndex: number
  points: UtilizationTrendPoint[]
}

/** [가동률 추이 위젯] 올해 1~12월 가동률 + 연도별 목표 대비 미달 여부. (MANAGER 이상) */
export async function getDashboardUtilizationTrend(): Promise<DashboardUtilizationTrend> {
  await requireManager()

  const now = new Date()
  const year = String(now.getFullYear())
  const [summary, target] = await Promise.all([
    getUtilizationYearlySummary(year, "actual"),
    prisma.utilizationYearlyTarget.findUnique({ where: { year } }),
  ])
  const targetRate = target?.targetRate ?? null

  return {
    year,
    targetRate,
    yearlyRate: summary.averages.utilizationRate,
    currentMonthIndex: now.getMonth(),
    points: summary.months.map((m) => ({
      targetMonth: m.targetMonth,
      utilizationRate: m.utilizationRate,
      belowTarget:
        targetRate !== null && m.utilizationRate !== null && m.utilizationRate < targetRate,
    })),
  }
}

export type NoWorkTrendMonth = {
  targetMonth: string
  totalIdleMm: number
  employees: { id: string; name: string; idleMm: number; rate: number }[]
}

/**
 * [노워크 인원 위젯] 이번 달 포함 앞으로 3개월간 월별로 "꽉 채워 투입되지 않은"
 * (가용 MM만큼 전부 투입되지 않은, 완전 유휴 포함) 인원입니다. getUtilizationMatrix의
 * rate<1(availableMm > inputMm)인 셀을 추립니다 — rate===null(그 달에 재직/가용 자체가
 * 없음)과 rate>=1(꽉 채워졌거나 과투입)은 제외합니다. 연도 경계를 넘어갈 수 있어(예:
 * 11월 조회 시 다음 해 1월 포함) 필요한 연도의 매트릭스를 모두 조회해 targetMonth로
 * 조회합니다. idleMm(=availableMm - inputMm)이 그 사람의 그 달 미투입 MM입니다.
 * (MANAGER 이상)
 */
export async function getDashboardNoWorkTrend(): Promise<NoWorkTrendMonth[]> {
  await requireManager()

  const now = new Date()
  const targetMonths = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const years = [...new Set(targetMonths.map((m) => m.slice(0, 4)))]
  const matrices = await Promise.all(years.map((y) => getUtilizationMatrix(y, "actual")))

  const cellsByEmployee = new Map<
    string,
    {
      name: string
      cells: Map<string, { rate: number | null; availableMm: number; inputMm: number }>
    }
  >()
  for (const matrix of matrices) {
    for (const row of matrix.rows) {
      if (!row.employeeId) continue
      const entry =
        cellsByEmployee.get(row.employeeId) ?? { name: row.name, cells: new Map() }
      for (const cell of row.months) {
        entry.cells.set(cell.targetMonth, {
          rate: cell.rate,
          availableMm: cell.availableMm,
          inputMm: cell.inputMm,
        })
      }
      cellsByEmployee.set(row.employeeId, entry)
    }
  }

  return targetMonths.map((targetMonth) => {
    const employees: { id: string; name: string; idleMm: number; rate: number }[] = []
    for (const [id, entry] of cellsByEmployee) {
      const cell = entry.cells.get(targetMonth)
      if (cell && cell.rate !== null && cell.rate < 1) {
        const idleMm = Math.round((cell.availableMm - cell.inputMm) * 100) / 100
        employees.push({ id, name: entry.name, idleMm, rate: cell.rate })
      }
    }
    employees.sort((a, b) => b.idleMm - a.idleMm)
    const totalIdleMm = Math.round(employees.reduce((sum, e) => sum + e.idleMm, 0) * 100) / 100
    return { targetMonth, totalIdleMm, employees }
  })
}

export type HeadcountCompositionMonth = {
  targetMonth: string
  regularCount: number
  contractCount: number
}

/** [월별 인원 구성 위젯] 올해 월별 정규직/계약직 인원 구성. (MANAGER 이상) */
export async function getDashboardHeadcountComposition(): Promise<
  HeadcountCompositionMonth[]
> {
  await requireManager()

  const year = String(new Date().getFullYear())
  const summary = await getUtilizationYearlySummary(year, "actual")

  return summary.months.map((m) => ({
    targetMonth: m.targetMonth,
    regularCount: m.regularCount,
    contractCount: m.contractCount,
  }))
}

export type DashboardHiresResignations = {
  targetMonth: string
  newHires: { id: string; name: string; detail?: string }[]
  resignations: { id: string; name: string; detail?: string }[]
}

/** [입사/퇴사 알림 위젯] 이번 달 입사자/퇴사자 명단. (MANAGER 이상) */
export async function getDashboardHiresResignations(): Promise<DashboardHiresResignations> {
  await requireManager()

  const now = new Date()
  const year = String(now.getFullYear())
  const summary = await getUtilizationYearlySummary(year, "actual")
  const current = summary.months[now.getMonth()]

  return {
    targetMonth: current.targetMonth,
    newHires: current.newHires,
    resignations: current.resignations,
  }
}

export type TeamUtilizationPoint = {
  teamName: string
  availableMm: number
  inputMm: number
  utilizationRate: number | null
}

/** [팀별 가동률 비교 위젯] 오늘 기준 팀별 가용/투입 공수와 가동률. (MANAGER 이상) */
export async function getTeamUtilizationComparison(): Promise<TeamUtilizationPoint[]> {
  await requireManager()

  const today = format(new Date(), "yyyy-MM-dd")
  const report = await getUtilizationReport(today, "actual")

  const byTeam = new Map<string, { availableMm: number; inputMm: number }>()
  for (const row of report.rows) {
    const entry = byTeam.get(row.teamName) ?? { availableMm: 0, inputMm: 0 }
    entry.availableMm += row.availableMm
    entry.inputMm += row.totalMm
    byTeam.set(row.teamName, entry)
  }

  return [...byTeam.entries()]
    .map(([teamName, v]) => {
      const availableMm = Math.round(v.availableMm * 100) / 100
      const inputMm = Math.round(v.inputMm * 100) / 100
      return {
        teamName,
        availableMm,
        inputMm,
        utilizationRate: availableMm > 0 ? Math.round((inputMm / availableMm) * 100) / 100 : null,
      }
    })
    .sort((a, b) => (b.utilizationRate ?? 0) - (a.utilizationRate ?? 0))
}

export type GradeDistributionItem = {
  gradeName: string
  count: number
}

const GRADE_DISPLAY_ORDER = ["특급", "고급", "중급", "초급", "등급 미상"]

/** [등급 분포 위젯] 재직자의 등급별 인원 분포. (MANAGER 이상) */
export async function getGradeDistribution(): Promise<GradeDistributionItem[]> {
  await requireManager()

  const today = new Date()
  const employees = await prisma.employee.findMany({
    where: { isExecutive: false },
    select: {
      joinDate: true,
      empType: true,
      resignDate: true,
      contractEndDate: true,
      grade: { select: { currentGrade: true } },
    },
  })

  const counts = new Map<string, number>()
  for (const employee of employees) {
    if (employee.joinDate > today) continue
    const effectiveResignDate = getEffectiveResignDate(employee, today)
    if (effectiveResignDate && effectiveResignDate <= today) continue

    const gradeName = employee.grade?.currentGrade ?? "등급 미상"
    counts.set(gradeName, (counts.get(gradeName) ?? 0) + 1)
  }

  return GRADE_DISPLAY_ORDER.filter((g) => counts.has(g)).map((g) => ({
    gradeName: g,
    count: counts.get(g) as number,
  }))
}

export type OverAllocatedEmployee = {
  id: string
  name: string
  teamName: string
  idleMm: number
}

/** [과투입 인원 위젯] 오늘 기준 가용 공수보다 많이 투입된 인원. (MANAGER 이상) */
export async function getOverAllocatedEmployees(): Promise<OverAllocatedEmployee[]> {
  await requireManager()

  const today = format(new Date(), "yyyy-MM-dd")
  const report = await getUtilizationReport(today, "actual")

  return report.rows
    .filter((row) => row.employeeId && row.idleMm < 0)
    .map((row) => ({
      id: row.employeeId as string,
      name: row.name,
      teamName: row.teamName,
      idleMm: row.idleMm,
    }))
    .sort((a, b) => a.idleMm - b.idleMm)
}
