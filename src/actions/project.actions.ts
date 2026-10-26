"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireManager, requireUser } from "@/lib/auth-utils"
import { GRADE_LABEL_EN } from "@/lib/employee-constants"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

/** Select의 "없음" 항목은 빈 문자열을 쓸 수 없어 사용하는 센티널 값. */
const NONE_PARENT_VALUE = "__none__"

function readParentProjectId(formData: FormData): string | undefined {
  const raw = formData.get("parentProjectId")
  if (!raw || raw === NONE_PARENT_VALUE) return undefined
  return String(raw)
}

/** 프로젝트 목록을 상위/하위 구조를 알 수 있는 정보와 함께 조회합니다. */
export async function getProjects() {
  await requireUser()

  return prisma.project.findMany({
    select: {
      id: true,
      projectCode: true,
      name: true,
      clientName: true,
      location: true,
      startDate: true,
      endDate: true,
      totalContractMm: true,
      parentProjectId: true,
      parentProject: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "desc" },
  })
}

/** "상위 프로젝트" 선택용 경량 목록입니다. 다시 하위를 둘 수 없도록 최상위(마스터) 프로젝트만 반환합니다. */
export async function getMasterProjectOptions() {
  await requireUser()

  return prisma.project.findMany({
    where: { parentProjectId: null },
    select: { id: true, projectCode: true, name: true },
    orderBy: { name: "asc" },
  })
}

/** 배정 기간 등록 등에서 쓰는, 하위 프로젝트까지 포함한 전체 프로젝트 경량 목록입니다. */
export async function getProjectOptions() {
  await requireUser()

  return prisma.project.findMany({
    select: { id: true, projectCode: true, name: true },
    orderBy: { name: "asc" },
  })
}

export type ProjectExportRow = {
  projectCode: string | null
  projectName: string
  employeeName: string
  teamName: string
  gradeKo: string
  gradeEn: string
  totalMm: number
  monthlyMm: (number | null)[]
}

export type ProjectExportData = {
  months: string[]
  rows: ProjectExportRow[]
}

/** "YYYY-MM"을 1씩 증가시킵니다. */
function nextMonth(targetMonth: string): string {
  const [y, m] = targetMonth.split("-").map(Number)
  const next = new Date(Date.UTC(y, m, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`
}

/**
 * 프로젝트 관리 메뉴의 "전체 내보내기"용 데이터입니다. (전체 조회 가능 사용자 — requireUser)
 * 최상위 프로젝트 단위로 묶되, 하위 프로젝트가 있으면 그 투입 인원까지 상위 프로젝트
 * 이름/코드 아래로 합쳐서 집계합니다(상세 화면의 "전체 투입 인원" 탭과 같은 집계 단위).
 * targetMonth가 [fromMonth, toMonth](둘 다 "YYYY-MM", 포함) 범위인 배정만 집계합니다.
 */
export async function getProjectInputExport(
  fromMonth: string,
  toMonth: string
): Promise<ProjectExportData> {
  await requireUser()

  const months: string[] = []
  for (let m = fromMonth; m <= toMonth; m = nextMonth(m)) {
    months.push(m)
    if (months.length > 36) break // 안전장치: 비정상적으로 긴 범위 방지
  }

  const topLevelProjects = await prisma.project.findMany({
    where: { parentProjectId: null },
    select: {
      id: true,
      projectCode: true,
      name: true,
      subProjects: { select: { id: true } },
    },
    orderBy: { startDate: "desc" },
  })

  const rows: ProjectExportRow[] = []

  for (const project of topLevelProjects) {
    const projectIds = [project.id, ...project.subProjects.map((s) => s.id)]

    const allocations = await prisma.projectAllocation.findMany({
      where: { projectId: { in: projectIds }, targetMonth: { gte: fromMonth, lte: toMonth } },
      select: {
        targetMonth: true,
        inputMm: true,
        employee: {
          select: {
            id: true,
            name: true,
            grade: { select: { currentGrade: true } },
            teamHistories: {
              where: { endDate: null },
              take: 1,
              orderBy: { startDate: "desc" },
              select: { team: { select: { teamName: true } } },
            },
          },
        },
      },
      orderBy: { employee: { name: "asc" } },
    })

    if (allocations.length === 0) continue

    const byEmployee = new Map<
      string,
      { name: string; teamName: string; gradeKo: string; monthly: Map<string, number> }
    >()

    for (const allocation of allocations) {
      const emp = allocation.employee
      const entry = byEmployee.get(emp.id) ?? {
        name: emp.name,
        teamName: emp.teamHistories[0]?.team.teamName ?? "미배정",
        gradeKo: emp.grade?.currentGrade ?? "미상",
        monthly: new Map<string, number>(),
      }
      entry.monthly.set(
        allocation.targetMonth,
        (entry.monthly.get(allocation.targetMonth) ?? 0) + allocation.inputMm
      )
      byEmployee.set(emp.id, entry)
    }

    for (const entry of byEmployee.values()) {
      const monthlyMm = months.map((m) => {
        const value = entry.monthly.get(m)
        return value ? Math.round(value * 100) / 100 : null
      })
      const totalMm =
        Math.round(
          monthlyMm.reduce((sum: number, v) => sum + (v ?? 0), 0) * 100
        ) / 100

      rows.push({
        projectCode: project.projectCode,
        projectName: project.name,
        employeeName: entry.name,
        teamName: entry.teamName,
        gradeKo: entry.gradeKo,
        gradeEn: GRADE_LABEL_EN[entry.gradeKo] ?? entry.gradeKo,
        totalMm,
        monthlyMm,
      })
    }
  }

  return { months, rows }
}

/** 프로젝트 상세 정보를 상위 프로젝트/하위 프로젝트 목록과 함께 조회합니다. */
export async function getProjectDetail(projectId: string) {
  await requireUser()

  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      parentProject: { select: { id: true, projectCode: true, name: true } },
      subProjects: {
        select: {
          id: true,
          projectCode: true,
          name: true,
          clientName: true,
          startDate: true,
          endDate: true,
          totalContractMm: true,
        },
        orderBy: { startDate: "desc" },
      },
    },
  })
}

export type ProjectState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

const createProjectSchema = z.object({
  projectCode: z.string().optional(),
  name: z.string().min(1, "프로젝트명을 입력하세요."),
  clientName: z.string().min(1, "발주처를 입력하세요."),
  location: z.string().optional(),
  startDate: z.string().min(1, "시작일을 선택하세요."),
  endDate: z.string().optional(),
  totalContractMm: z.coerce.number().min(0, "0 이상의 값을 입력하세요.").optional(),
  parentProjectId: z.string().optional(),
})

/**
 * 상위 프로젝트로 지정하려는 대상이 유효한지 확인합니다.
 * (존재해야 하고, 그 프로젝트 자신도 이미 하위 프로젝트여서는 안 됩니다 — 2단계까지만 허용)
 */
async function validateParentProject(
  parentProjectId: string | undefined,
  selfId?: string
): Promise<string | null> {
  if (!parentProjectId) return null

  if (parentProjectId === selfId) {
    return "자기 자신을 상위 프로젝트로 지정할 수 없습니다."
  }

  const parent = await prisma.project.findUnique({
    where: { id: parentProjectId },
    select: { parentProjectId: true },
  })

  if (!parent) {
    return "선택한 상위 프로젝트를 찾을 수 없습니다."
  }
  if (parent.parentProjectId) {
    return "하위 프로젝트를 다시 상위 프로젝트로 지정할 수 없습니다."
  }

  return null
}

/** 프로젝트를 등록합니다. (ADMIN, MANAGER 전용) */
export async function createProject(
  _prevState: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  await requireManager()

  const values = formDataToRecord(formData)

  const parsed = createProjectSchema.safeParse({
    projectCode: formData.get("projectCode") || undefined,
    name: formData.get("name"),
    clientName: formData.get("clientName"),
    location: formData.get("location") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    totalContractMm: formData.get("totalContractMm") || undefined,
    parentProjectId: readParentProjectId(formData),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  if (parsed.data.projectCode) {
    const existing = await prisma.project.findUnique({
      where: { projectCode: parsed.data.projectCode },
    })
    if (existing) {
      return { error: "이미 사용 중인 프로젝트 코드입니다.", values }
    }
  }

  const parentError = await validateParentProject(parsed.data.parentProjectId)
  if (parentError) {
    return { error: parentError, values }
  }

  const {
    projectCode,
    name,
    clientName,
    location,
    startDate,
    endDate,
    totalContractMm,
    parentProjectId,
  } = parsed.data

  try {
    await prisma.project.create({
      data: {
        projectCode: projectCode ?? null,
        name,
        clientName,
        location,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        totalContractMm: totalContractMm ?? null,
        parentProjectId: parentProjectId || null,
      },
    })
  } catch (error) {
    console.error("[createProject]", error)
    return { error: "프로젝트 등록 중 오류가 발생했습니다.", values }
  }

  revalidatePath("/projects")
  if (parentProjectId) revalidatePath(`/projects/${parentProjectId}`)
  return { success: true }
}

const updateProjectSchema = z.object({
  projectId: z.string().min(1),
  projectCode: z.string().optional(),
  name: z.string().min(1, "프로젝트명을 입력하세요."),
  clientName: z.string().min(1, "발주처를 입력하세요."),
  location: z.string().optional(),
  startDate: z.string().min(1, "시작일을 선택하세요."),
  endDate: z.string().optional(),
  totalContractMm: z.coerce.number().min(0, "0 이상의 값을 입력하세요.").optional(),
  parentProjectId: z.string().optional(),
})

/** 프로젝트 기본 정보를 수정합니다. (ADMIN, MANAGER 전용) */
export async function updateProject(
  _prevState: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  await requireManager()

  const values = formDataToRecord(formData)

  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    projectCode: formData.get("projectCode") || undefined,
    name: formData.get("name"),
    clientName: formData.get("clientName"),
    location: formData.get("location") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    totalContractMm: formData.get("totalContractMm") || undefined,
    parentProjectId: readParentProjectId(formData),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.",
      values,
    }
  }

  const { projectId } = parsed.data

  if (parsed.data.projectCode) {
    const existing = await prisma.project.findUnique({
      where: { projectCode: parsed.data.projectCode },
    })
    if (existing && existing.id !== projectId) {
      return { error: "이미 사용 중인 프로젝트 코드입니다.", values }
    }
  }

  const hasSubProjects = await prisma.project.count({
    where: { parentProjectId: projectId },
  })
  if (hasSubProjects > 0 && parsed.data.parentProjectId) {
    return {
      error: "하위 프로젝트를 보유한 프로젝트는 다른 프로젝트의 하위로 지정할 수 없습니다.",
      values,
    }
  }

  const parentError = await validateParentProject(
    parsed.data.parentProjectId,
    projectId
  )
  if (parentError) {
    return { error: parentError, values }
  }

  const {
    projectCode,
    name,
    clientName,
    location,
    startDate,
    endDate,
    totalContractMm,
    parentProjectId,
  } = parsed.data

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        projectCode: projectCode ?? null,
        name,
        clientName,
        location,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        totalContractMm: totalContractMm ?? null,
        parentProjectId: parentProjectId || null,
      },
    })
  } catch (error) {
    console.error("[updateProject]", error)
    return { error: "프로젝트 수정 중 오류가 발생했습니다.", values }
  }

  revalidatePath("/projects")
  revalidatePath(`/projects/${projectId}`)
  if (parentProjectId) revalidatePath(`/projects/${parentProjectId}`)
  return { success: true }
}

/**
 * 프로젝트를 삭제합니다. (ADMIN, MANAGER 전용)
 * 투입(MM) 데이터가 하나라도 있거나 하위 프로젝트가 있으면 삭제를 막습니다.
 */
export async function deleteProject(
  projectId: string
): Promise<{ error?: string }> {
  await requireManager()

  const [allocationCount, subProjectCount, project] = await Promise.all([
    prisma.projectAllocation.count({ where: { projectId } }),
    prisma.project.count({ where: { parentProjectId: projectId } }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { parentProjectId: true },
    }),
  ])

  if (allocationCount > 0) {
    return {
      error: `투입(MM) 데이터가 ${allocationCount}건 있어 삭제할 수 없습니다. 먼저 투입 데이터를 삭제해주세요.`,
    }
  }
  if (subProjectCount > 0) {
    return {
      error: `하위 프로젝트가 ${subProjectCount}건 있어 삭제할 수 없습니다. 먼저 하위 프로젝트를 정리해주세요.`,
    }
  }

  try {
    await prisma.project.delete({ where: { id: projectId } })
  } catch (error) {
    console.error("[deleteProject]", error)
    return { error: "프로젝트 삭제 중 오류가 발생했습니다." }
  }

  revalidatePath("/projects")
  if (project?.parentProjectId) revalidatePath(`/projects/${project.parentProjectId}`)
  return {}
}
