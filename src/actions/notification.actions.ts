"use server"

import { revalidatePath } from "next/cache"
import { addMonths, format } from "date-fns"

import { getNotificationSetting } from "@/actions/notification-settings.actions"
import { getUtilizationYearlySummary } from "@/actions/utilization.actions"
import { requireManager, isManagerOrAbove } from "@/lib/auth-utils"
import { getEffectiveResignDate, getTenureMonths } from "@/lib/employee-constants"
import { computeGradeProjections } from "@/lib/grade"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

type NotificationDraft = {
  type: Prisma.NotificationCreateManyInput["type"]
  title: string
  message: string
  link?: string
  targetKey: string
  occurredOn: Date
}

export type HrCommitteeCandidate = { id: string; name: string; date: Date }
export type HrCommitteeCandidates = {
  regularConversions: HrCommitteeCandidate[]
  contractExtensions: HrCommitteeCandidate[]
}

/**
 * 설정된 사전알림 기간 내 정규직 전환/계약직 연장 대상자를 조회합니다. 알림 생성
 * (applyDueNotificationChecks)과 "인사위원회 필요인력" 대시보드 위젯이 같이 씁니다.
 * (MANAGER 이상)
 */
export async function getHrCommitteeCandidates(): Promise<HrCommitteeCandidates> {
  await requireManager()

  const today = new Date()
  const setting = await getNotificationSetting()

  const [conversions, extensions] = await Promise.all([
    prisma.employee.findMany({
      where: {
        empType: "CONTRACT",
        resignDate: null,
        regularConversionDate: {
          not: null,
          gte: today,
          lte: addMonths(today, setting.regularConversionLeadMonths),
        },
      },
      select: { id: true, name: true, regularConversionDate: true },
      orderBy: { regularConversionDate: "asc" },
    }),
    prisma.employee.findMany({
      where: {
        empType: "CONTRACT",
        resignDate: null,
        contractEndDate: { gte: today, lte: addMonths(today, setting.contractExtensionLeadMonths) },
      },
      select: { id: true, name: true, contractEndDate: true },
      orderBy: { contractEndDate: "asc" },
    }),
  ])

  return {
    regularConversions: conversions.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.regularConversionDate as Date,
    })),
    contractExtensions: extensions.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.contractEndDate as Date,
    })),
  }
}

export type GradeUpgradeCandidate = {
  id: string
  name: string
  gradeName: string
  projectedDate: Date
}

/**
 * 설정된 사전알림 기간 내 등급 상승이 예상되는 인원을 조회합니다. 알림 생성과
 * "등급 상승 임박" 대시보드 위젯이 같이 씁니다. (MANAGER 이상)
 */
export async function getGradeUpgradeCandidates(): Promise<GradeUpgradeCandidate[]> {
  await requireManager()

  const today = new Date()
  const setting = await getNotificationSetting()
  const gradeCutoff = addMonths(today, setting.gradeUpgradeLeadMonths)

  const [criteria, employees] = await Promise.all([
    prisma.gradeCriterion.findMany(),
    prisma.employee.findMany({
      where: { resignDate: null, isExecutive: false },
      select: {
        id: true,
        name: true,
        joinDate: true,
        empType: true,
        resignDate: true,
        contractEndDate: true,
        grade: { select: { eduMonths: true, certMonths: true, expMonths: true } },
      },
    }),
  ])

  const candidates: GradeUpgradeCandidate[] = []
  for (const emp of employees) {
    const effectiveResignDate = getEffectiveResignDate(emp, today)
    if (effectiveResignDate && effectiveResignDate <= today) continue

    const fixedMonths =
      (emp.grade?.eduMonths ?? 0) + (emp.grade?.certMonths ?? 0) + (emp.grade?.expMonths ?? 0)
    const tenureMonths = getTenureMonths(emp, today)
    const projections = computeGradeProjections(criteria, fixedMonths, tenureMonths, emp.joinDate, false)
    const next = projections.find((p) => p.status === "projected")

    if (next?.projectedDate && next.projectedDate <= gradeCutoff) {
      candidates.push({
        id: emp.id,
        name: emp.name,
        gradeName: next.gradeName,
        projectedDate: next.projectedDate,
      })
    }
  }

  return candidates.sort((a, b) => a.projectedDate.getTime() - b.projectedDate.getTime())
}

/**
 * 알림 생성 기준(NotificationSetting/UtilizationYearlyTarget)에 따라 밀린 알림을
 * 생성합니다. applyDueRegularConversions 등과 동일한 "조회 시점마다 호출해 자가치유"
 * 패턴입니다 — 별도 크론이 없습니다. 관리자/매니저가 아니면 조용히 아무 것도 하지
 * 않습니다(알림 자체가 HR 성격이라 USER 권한에게는 의미가 없음).
 */
export async function applyDueNotificationChecks(): Promise<void> {
  const privileged = await isManagerOrAbove()
  if (!privileged) return

  const today = new Date()
  const drafts: NotificationDraft[] = []

  // 1. 가동률 목표 미달 — 이미 끝난 달만(진행 중인 달은 알림함에 안 쌓음)
  const year = String(today.getFullYear())
  const target = await prisma.utilizationYearlyTarget.findUnique({ where: { year } })
  if (target) {
    const summary = await getUtilizationYearlySummary(year, "actual")
    const currentMonthIndex = today.getMonth() // 0-based, 이 인덱스 이전 달까지가 "완료된 달"
    for (let i = 0; i < currentMonthIndex; i++) {
      const m = summary.months[i]
      if (m.utilizationRate !== null && m.utilizationRate < target.targetRate) {
        drafts.push({
          type: "UTILIZATION_BELOW_TARGET",
          title: `${m.targetMonth} 가동률 목표 미달`,
          message: `${m.targetMonth} 가동률 ${Math.round(m.utilizationRate * 100)}% (목표 ${Math.round(target.targetRate * 100)}%)`,
          link: "/utilization",
          targetKey: `util-${m.targetMonth}`,
          occurredOn: new Date(`${m.targetMonth}-01`),
        })
      }
    }
  }

  // 2. 정규직 전환 임박 + 3. 계약직 연장 필요
  const { regularConversions, contractExtensions } = await getHrCommitteeCandidates()
  for (const emp of regularConversions) {
    drafts.push({
      type: "REGULAR_CONVERSION",
      title: `${emp.name} 정규직 전환 예정`,
      message: `전환 예정일: ${format(emp.date, "yyyy-MM-dd")}`,
      link: `/employees/${emp.id}`,
      targetKey: `regconv-${emp.id}-${format(emp.date, "yyyy-MM")}`,
      occurredOn: emp.date,
    })
  }
  for (const emp of contractExtensions) {
    drafts.push({
      type: "CONTRACT_EXTENSION",
      title: `${emp.name} 계약 연장 검토 필요`,
      message: `계약 종료일: ${format(emp.date, "yyyy-MM-dd")}`,
      link: `/employees/${emp.id}`,
      targetKey: `ctext-${emp.id}-${format(emp.date, "yyyy-MM-dd")}`,
      occurredOn: emp.date,
    })
  }

  // 4. 등급 상승 임박
  const gradeUpgrades = await getGradeUpgradeCandidates()
  for (const emp of gradeUpgrades) {
    drafts.push({
      type: "GRADE_UPGRADE",
      title: `${emp.name} ${emp.gradeName} 승급 임박`,
      message: `예상 도달일: ${format(emp.projectedDate, "yyyy-MM-dd")}`,
      link: `/employees/${emp.id}?tab=grade`,
      targetKey: `grade-${emp.id}-${emp.gradeName}`,
      occurredOn: emp.projectedDate,
    })
  }

  if (drafts.length === 0) return

  // SQLite는 createMany의 skipDuplicates를 지원하지 않아, 기존에 쌓인 targetKey를
  // 먼저 조회해 새 것만 추가합니다. 동시 요청으로 인한 극히 드문 중복 생성 시도는
  // createMany 실패를 무시하고 다음 방문 때 다시 걸러지도록 둡니다.
  const existing = await prisma.notification.findMany({
    where: { OR: drafts.map((d) => ({ type: d.type, targetKey: d.targetKey })) },
    select: { type: true, targetKey: true },
  })
  const existingKeys = new Set(existing.map((e) => `${e.type}:${e.targetKey}`))
  const toCreate = drafts.filter((d) => !existingKeys.has(`${d.type}:${d.targetKey}`))

  if (toCreate.length === 0) return

  try {
    await prisma.notification.createMany({ data: toCreate })
  } catch (error) {
    console.error("[applyDueNotificationChecks]", error)
  }
}

export type NotificationListItem = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  occurredOn: Date
  readAt: Date | null
  createdAt: Date
}

/** 알림 목록을 최신순으로 조회합니다. (MANAGER 이상) */
export async function getNotifications(options?: {
  onlyUnread?: boolean
  limit?: number
}): Promise<NotificationListItem[]> {
  await requireManager()

  return prisma.notification.findMany({
    where: options?.onlyUnread ? { readAt: null } : undefined,
    orderBy: { occurredOn: "desc" },
    take: options?.limit,
  })
}

/** 안 읽은 알림 개수를 조회합니다. (MANAGER 이상) */
export async function getUnreadNotificationCount(): Promise<number> {
  await requireManager()

  return prisma.notification.count({ where: { readAt: null } })
}

/** 알림 1건을 읽음 처리합니다. (MANAGER 이상) */
export async function markNotificationRead(id: string): Promise<void> {
  await requireManager()

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  })

  // 헤더의 알림벨은 (dashboard) 레이아웃에서 렌더되므로 레이아웃 전체를 갱신합니다.
  revalidatePath("/", "layout")
}

/** 모든 알림을 읽음 처리합니다. (MANAGER 이상) */
export async function markAllNotificationsRead(): Promise<void> {
  await requireManager()

  await prisma.notification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  })

  revalidatePath("/", "layout")
}
