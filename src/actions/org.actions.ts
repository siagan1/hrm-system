"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin, requireUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { formDataToRecord } from "@/lib/utils"

// ── 공통 헬퍼 ─────────────────────────────

function addDaysUtc(date: Date, days: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days)
  )
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b
  return a.getTime() === b.getTime()
}

/** 주어진 시점(asOf)에 "살아있는" Group/Team을 고르는 조건. 둘 다 null 허용 개방구간. */
function liveAtFilter(asOf: Date) {
  return {
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: asOf } }] },
      { OR: [{ endDate: null }, { endDate: { gte: asOf } }] },
    ],
  }
}

/** startDate가 null(처음부터)인 배치를 가리킬 때 쓰는 sentinel 날짜. */
const EPOCH = new Date(0)

// ── 자가 치유: 효력일이 지난 그룹/팀 개편을 배정 이력에 지연 반영 ──

/**
 * 효력일이 지난 조직개편을 EmployeeTeamHistory까지 자동으로 반영합니다.
 * applyDueRegularConversions()와 같은 "지연 반영·자가 치유" 패턴입니다.
 * 1) 효력일 지난 그룹 개편(이름변경/후속그룹) -> 그 아래 살아있는 팀들을 새 그룹으로 이관
 * 2) 효력일 지난 팀 개편(이름변경/그룹이동) -> 그 팀에 배정된 직원 이력을 새 팀으로 이관
 * 변화가 없을 때까지 반복해 여러 단계 체인도 처리합니다.
 */
export async function applyDueOrgSuccessions(): Promise<void> {
  const today = new Date()
  let changed = true

  while (changed) {
    changed = false

    const groupsDue = await prisma.group.findMany({
      where: { endDate: { lte: today }, nextGroup: { isNot: null } },
      include: { nextGroup: true, teams: { where: liveAtFilter(today) } },
    })
    for (const group of groupsDue) {
      if (!group.nextGroup) continue
      for (const team of group.teams) {
        await prisma.$transaction([
          prisma.team.update({ where: { id: team.id }, data: { endDate: group.endDate } }),
          prisma.team.create({
            data: {
              teamName: team.teamName,
              description: team.description,
              groupId: group.nextGroup.id,
              startDate: group.nextGroup.startDate,
              previousTeamId: team.id,
            },
          }),
        ])
        changed = true
      }
    }

    const teamsDue = await prisma.team.findMany({
      where: {
        endDate: { lte: today },
        nextTeam: { isNot: null },
        employeeHistories: { some: { endDate: null } },
      },
      include: { nextTeam: true, employeeHistories: { where: { endDate: null } } },
    })
    for (const team of teamsDue) {
      if (!team.nextTeam) continue
      const ops = team.employeeHistories.flatMap((history) => [
        prisma.employeeTeamHistory.update({
          where: { id: history.id },
          data: { endDate: team.endDate },
        }),
        prisma.employeeTeamHistory.create({
          data: {
            employeeId: history.employeeId,
            teamId: team.nextTeam!.id,
            startDate: team.nextTeam!.startDate!,
            endDate: null,
          },
        }),
      ])
      await prisma.$transaction(ops)
      changed = true
    }
  }
}

// ── 조회 ─────────────────────────────

/** 배정 드롭다운 등에서 쓰는, 오늘 기준 살아있는 팀 경량 목록. */
export async function getActiveTeamOptions(): Promise<
  { id: string; teamName: string }[]
> {
  await requireUser()
  await applyDueOrgSuccessions()

  const today = new Date()
  return prisma.team.findMany({
    where: liveAtFilter(today),
    select: { id: true, teamName: true },
    orderBy: { teamName: "asc" },
  })
}

export type OrgChartTeam = { id: string; teamName: string; description: string | null }
export type OrgChartGroup = {
  id: string
  groupName: string
  description: string | null
  teams: OrgChartTeam[]
}
export type OrgChartData = {
  asOf: string
  groups: OrgChartGroup[]
  ungroupedTeams: OrgChartTeam[]
}

/** 특정 시점(asOf) 기준의 조직도 스냅샷을 조회합니다. (ADMIN 전용) */
export async function getOrgChartAsOf(asOf: Date): Promise<OrgChartData> {
  await requireAdmin()
  await applyDueOrgSuccessions()

  const [groups, teams] = await Promise.all([
    prisma.group.findMany({ where: liveAtFilter(asOf), orderBy: { groupName: "asc" } }),
    prisma.team.findMany({ where: liveAtFilter(asOf), orderBy: { teamName: "asc" } }),
  ])

  const groupMap = new Map<string, OrgChartGroup>(
    groups.map((g) => [
      g.id,
      { id: g.id, groupName: g.groupName, description: g.description, teams: [] },
    ])
  )
  const ungroupedTeams: OrgChartTeam[] = []

  for (const team of teams) {
    const entry: OrgChartTeam = {
      id: team.id,
      teamName: team.teamName,
      description: team.description,
    }
    if (team.groupId && groupMap.has(team.groupId)) {
      groupMap.get(team.groupId)!.teams.push(entry)
    } else {
      ungroupedTeams.push(entry)
    }
  }

  return { asOf: toDateOnlyString(asOf), groups: [...groupMap.values()], ungroupedTeams }
}

export type ReorgBatch = {
  /** null = 처음부터(초기 백필) */
  effectiveDate: string | null
  /** null = 현재 */
  effectiveEndDate: string | null
  groupCount: number
  teamCount: number
  changedGroupCount: number
  changedTeamCount: number
}

/**
 * 조직개편 이력을 배치 단위로(최신순) 조회합니다. (ADMIN 전용)
 * 배치는 Group∪Team의 distinct startDate에서 그대로 파생됩니다 — 별도 이력 테이블 없음.
 * periodStart/periodEnd를 주면 그 기간과 겹치는 배치만 반환합니다.
 */
export async function getReorgBatches(
  periodStart?: Date,
  periodEnd?: Date
): Promise<ReorgBatch[]> {
  await requireAdmin()
  await applyDueOrgSuccessions()

  const [groupDates, teamDates] = await Promise.all([
    prisma.group.findMany({ select: { startDate: true }, distinct: ["startDate"] }),
    prisma.team.findMany({ select: { startDate: true }, distinct: ["startDate"] }),
  ])

  let hasNullStart = false
  const dateSet = new Set<number>()
  for (const row of [...groupDates, ...teamDates]) {
    if (row.startDate === null) hasNullStart = true
    else dateSet.add(row.startDate.getTime())
  }

  const sortedDatesDesc = [...dateSet].sort((a, b) => b - a)

  const boundaries: { start: Date | null; end: Date | null }[] = sortedDatesDesc.map(
    (ms, i) => ({
      start: new Date(ms),
      end: i === 0 ? null : addDaysUtc(new Date(sortedDatesDesc[i - 1]), -1),
    })
  )
  if (hasNullStart || sortedDatesDesc.length === 0) {
    const oldest = sortedDatesDesc[sortedDatesDesc.length - 1]
    boundaries.push({
      start: null,
      end: oldest !== undefined ? addDaysUtc(new Date(oldest), -1) : null,
    })
  }

  const filtered =
    periodStart && periodEnd
      ? boundaries.filter((b) => {
          const start = b.start ?? EPOCH
          if (start > periodEnd) return false
          if (b.end && b.end < periodStart) return false
          return true
        })
      : boundaries

  const batches: ReorgBatch[] = []
  for (const b of filtered) {
    const asOf = b.start ?? EPOCH
    const [groups, teams] = await Promise.all([
      prisma.group.findMany({ where: liveAtFilter(asOf) }),
      prisma.team.findMany({ where: liveAtFilter(asOf) }),
    ])
    batches.push({
      effectiveDate: b.start ? toDateOnlyString(b.start) : null,
      effectiveEndDate: b.end ? toDateOnlyString(b.end) : null,
      groupCount: groups.length,
      teamCount: teams.length,
      changedGroupCount: groups.filter((g) => sameDay(g.startDate, b.start)).length,
      changedTeamCount: teams.filter((t) => sameDay(t.startDate, b.start)).length,
    })
  }
  return batches
}

export type EditableTeam = {
  id: string
  teamName: string
  description: string | null
  activeMemberCount: number
}
export type EditableGroup = {
  id: string
  groupName: string
  description: string | null
  teams: EditableTeam[]
}

/** 조직개편 등록 화면의 시작값으로 쓸, 오늘 기준 살아있는 전체 트리. (ADMIN 전용) */
export async function getOrgStructureForEditing(): Promise<{
  groups: EditableGroup[]
  ungroupedTeams: EditableTeam[]
}> {
  await requireAdmin()
  await applyDueOrgSuccessions()

  const today = new Date()
  const [groups, teams] = await Promise.all([
    prisma.group.findMany({ where: liveAtFilter(today), orderBy: { groupName: "asc" } }),
    prisma.team.findMany({
      where: liveAtFilter(today),
      orderBy: { teamName: "asc" },
      include: { employeeHistories: { where: { endDate: null }, select: { id: true } } },
    }),
  ])

  const groupMap = new Map<string, EditableGroup>(
    groups.map((g) => [
      g.id,
      { id: g.id, groupName: g.groupName, description: g.description, teams: [] },
    ])
  )
  const ungroupedTeams: EditableTeam[] = []

  for (const team of teams) {
    const entry: EditableTeam = {
      id: team.id,
      teamName: team.teamName,
      description: team.description,
      activeMemberCount: team.employeeHistories.length,
    }
    if (team.groupId && groupMap.has(team.groupId)) {
      groupMap.get(team.groupId)!.teams.push(entry)
    } else {
      ungroupedTeams.push(entry)
    }
  }

  return { groups: [...groupMap.values()], ungroupedTeams }
}

// ── 조직개편 등록 ─────────────────────────────

const reorgTeamSchema = z.object({
  id: z.string().nullable(),
  teamName: z.string().min(1, "팀명을 입력하세요."),
  description: z.string().nullable(),
})
const reorgGroupSchema = z.object({
  id: z.string().nullable(),
  groupName: z.string().min(1, "그룹명을 입력하세요."),
  description: z.string().nullable(),
  teams: z.array(reorgTeamSchema),
})
const submitReorgSchema = z.object({
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "효력일을 선택하세요."),
  groups: z.array(reorgGroupSchema),
  ungroupedTeams: z.array(reorgTeamSchema),
})

export type SubmitReorgInput = z.infer<typeof submitReorgSchema>
export type SubmitReorgResult = { error?: string; success?: boolean }

const NO_OP = "__NO_OP__"

/**
 * 조직개편을 한 번에 등록합니다. (ADMIN 전용)
 * 현재 살아있는 구조와 입력을 비교해, 바뀐(이름/설명/소속그룹) 그룹·팀만 닫고
 * 후속 row를 새로 열며(previousGroupId/previousTeamId 연결), 안 바뀐 것은 그대로 둡니다.
 * 입력에서 빠진(=삭제된) 팀은 활성 배정 인원이 있으면 등록 자체를 거부합니다.
 */
export async function submitReorg(input: SubmitReorgInput): Promise<SubmitReorgResult> {
  await requireAdmin()

  const parsed = submitReorgSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." }
  }

  const effectiveDate = new Date(parsed.data.effectiveDate)
  const closeDate = addDaysUtc(effectiveDate, -1)

  const [latestGroup, latestTeam] = await Promise.all([
    prisma.group.findFirst({
      where: { startDate: { not: null } },
      orderBy: { startDate: "desc" },
    }),
    prisma.team.findFirst({
      where: { startDate: { not: null } },
      orderBy: { startDate: "desc" },
    }),
  ])
  const latestDate = [latestGroup?.startDate, latestTeam?.startDate]
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0]
  if (latestDate && effectiveDate <= latestDate) {
    return { error: "효력일은 가장 최근 조직개편보다 이후 날짜여야 합니다." }
  }

  const today = new Date()
  const liveGroups = await prisma.group.findMany({ where: liveAtFilter(today) })
  const liveTeams = await prisma.team.findMany({
    where: liveAtFilter(today),
    include: { employeeHistories: { where: { endDate: null }, select: { id: true } } },
  })
  const liveGroupMap = new Map(liveGroups.map((g) => [g.id, g]))
  const liveTeamMap = new Map(liveTeams.map((t) => [t.id, t]))

  const flatInputTeams = [
    ...parsed.data.groups.flatMap((g) =>
      g.teams.map((t) => ({ ...t, groupInputId: g.id }))
    ),
    ...parsed.data.ungroupedTeams.map((t) => ({ ...t, groupInputId: null as string | null })),
  ]

  for (const g of parsed.data.groups) {
    if (g.id && !liveGroupMap.has(g.id)) {
      return { error: `존재하지 않는 그룹입니다: ${g.groupName}` }
    }
  }
  for (const t of flatInputTeams) {
    if (t.id && !liveTeamMap.has(t.id)) {
      return { error: `존재하지 않는 팀입니다: ${t.teamName}` }
    }
  }

  const groupNameSet = new Set<string>()
  for (const g of parsed.data.groups) {
    if (groupNameSet.has(g.groupName)) {
      return { error: `그룹명이 중복됩니다: ${g.groupName}` }
    }
    groupNameSet.add(g.groupName)
  }
  const teamNameSet = new Set<string>()
  for (const t of flatInputTeams) {
    if (teamNameSet.has(t.teamName)) {
      return { error: `팀명이 중복됩니다: ${t.teamName}` }
    }
    teamNameSet.add(t.teamName)
  }

  const inputTeamIds = new Set(flatInputTeams.filter((t) => t.id).map((t) => t.id as string))
  const removedTeams = liveTeams.filter((t) => !inputTeamIds.has(t.id))
  const blockedTeams = removedTeams.filter((t) => t.employeeHistories.length > 0)
  if (blockedTeams.length > 0) {
    return {
      error: `현재 소속 인원이 있어 삭제할 수 없는 팀입니다: ${blockedTeams
        .map((t) => t.teamName)
        .join(", ")}. 먼저 소속을 변경해주세요.`,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      let changeCount = 0
      const usedGroupIds = new Set<string>()
      const usedTeamIds = new Set<string>()

      async function upsertTeam(
        t: z.infer<typeof reorgTeamSchema>,
        groupId: string | null
      ): Promise<number> {
        if (t.id) {
          const live = liveTeamMap.get(t.id)!
          usedTeamIds.add(t.id)
          const changed =
            live.teamName !== t.teamName ||
            (live.description ?? "") !== (t.description ?? "") ||
            live.groupId !== groupId
          if (!changed) return 0

          await tx.team.update({ where: { id: live.id }, data: { endDate: closeDate } })
          await tx.team.create({
            data: {
              teamName: t.teamName,
              description: t.description,
              groupId,
              startDate: effectiveDate,
              previousTeamId: live.id,
            },
          })
          return 1
        }

        await tx.team.create({
          data: { teamName: t.teamName, description: t.description, groupId, startDate: effectiveDate },
        })
        return 1
      }

      for (const g of parsed.data.groups) {
        let resolvedGroupId: string
        if (g.id) {
          const live = liveGroupMap.get(g.id)!
          usedGroupIds.add(g.id)
          const changed =
            live.groupName !== g.groupName || (live.description ?? "") !== (g.description ?? "")
          if (changed) {
            await tx.group.update({ where: { id: live.id }, data: { endDate: closeDate } })
            const created = await tx.group.create({
              data: {
                groupName: g.groupName,
                description: g.description,
                startDate: effectiveDate,
                previousGroupId: live.id,
              },
            })
            resolvedGroupId = created.id
            changeCount++
          } else {
            resolvedGroupId = live.id
          }
        } else {
          const created = await tx.group.create({
            data: { groupName: g.groupName, description: g.description, startDate: effectiveDate },
          })
          resolvedGroupId = created.id
          changeCount++
        }

        for (const t of g.teams) {
          changeCount += await upsertTeam(t, resolvedGroupId)
        }
      }

      for (const t of parsed.data.ungroupedTeams) {
        changeCount += await upsertTeam(t, null)
      }

      for (const live of liveGroups) {
        if (!usedGroupIds.has(live.id)) {
          await tx.group.update({ where: { id: live.id }, data: { endDate: closeDate } })
          changeCount++
        }
      }
      for (const live of liveTeams) {
        if (!usedTeamIds.has(live.id)) {
          await tx.team.update({ where: { id: live.id }, data: { endDate: closeDate } })
          changeCount++
        }
      }

      if (changeCount === 0) {
        throw new Error(NO_OP)
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message === NO_OP) {
      return { error: "변경 사항이 없습니다." }
    }
    console.error("[submitReorg]", error)
    return { error: "조직개편 등록 중 오류가 발생했습니다." }
  }

  revalidatePath("/teams")
  return { success: true }
}

// ── 간단 수정(오타 등) — 조직개편 이력을 남기지 않고 현재 row를 바로 고칩니다 ──

export type OrgUnitMetadataState = {
  error?: string
  success?: boolean
  values?: Record<string, string>
}

const groupMetadataSchema = z.object({
  id: z.string().min(1),
  groupName: z.string().min(1, "그룹명을 입력하세요."),
  description: z.string().optional(),
})

/**
 * 현재 살아있는 그룹의 이름/설명만 즉시 수정합니다. (ADMIN 전용)
 * 조직개편이 아니라 오타 등 단순 정정용 — 새 row/이력이 생기지 않고 기존 row가 바로 바뀝니다.
 */
export async function updateGroupMetadata(
  _prevState: OrgUnitMetadataState,
  formData: FormData
): Promise<OrgUnitMetadataState> {
  await requireAdmin()

  const values = formDataToRecord(formData)
  const parsed = groupMetadataSchema.safeParse({
    id: formData.get("id"),
    groupName: formData.get("groupName"),
    description: formData.get("description") || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.", values }
  }

  const today = new Date()
  const duplicate = await prisma.group.findFirst({
    where: {
      groupName: parsed.data.groupName,
      id: { not: parsed.data.id },
      ...liveAtFilter(today),
    },
  })
  if (duplicate) {
    return { error: "이미 사용 중인 그룹명입니다.", values }
  }

  try {
    await prisma.group.update({
      where: { id: parsed.data.id },
      data: { groupName: parsed.data.groupName, description: parsed.data.description ?? null },
    })
  } catch (error) {
    console.error("[updateGroupMetadata]", error)
    return { error: "그룹 수정 중 오류가 발생했습니다.", values }
  }

  revalidatePath("/teams")
  return { success: true }
}

const teamMetadataSchema = z.object({
  id: z.string().min(1),
  teamName: z.string().min(1, "팀명을 입력하세요."),
  description: z.string().optional(),
})

/**
 * 현재 살아있는 팀의 이름/설명만 즉시 수정합니다. (ADMIN 전용)
 * 조직개편이 아니라 오타 등 단순 정정용 — 새 row/이력이 생기지 않고 기존 row가 바로 바뀝니다.
 */
export async function updateTeamMetadata(
  _prevState: OrgUnitMetadataState,
  formData: FormData
): Promise<OrgUnitMetadataState> {
  await requireAdmin()

  const values = formDataToRecord(formData)
  const parsed = teamMetadataSchema.safeParse({
    id: formData.get("id"),
    teamName: formData.get("teamName"),
    description: formData.get("description") || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요.", values }
  }

  const today = new Date()
  const duplicate = await prisma.team.findFirst({
    where: {
      teamName: parsed.data.teamName,
      id: { not: parsed.data.id },
      ...liveAtFilter(today),
    },
  })
  if (duplicate) {
    return { error: "이미 사용 중인 팀명입니다.", values }
  }

  try {
    await prisma.team.update({
      where: { id: parsed.data.id },
      data: { teamName: parsed.data.teamName, description: parsed.data.description ?? null },
    })
  } catch (error) {
    console.error("[updateTeamMetadata]", error)
    return { error: "팀 수정 중 오류가 발생했습니다.", values }
  }

  revalidatePath("/teams")
  return { success: true }
}
