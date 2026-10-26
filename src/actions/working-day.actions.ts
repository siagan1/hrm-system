"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { getMonthWorkingDayInfo, type MonthWorkingDayInfo } from "@/lib/working-days"

function yearRangeUtc(year: string) {
  const y = Number(year)
  return {
    start: new Date(Date.UTC(y, 0, 1)),
    end: new Date(Date.UTC(y + 1, 0, 1)),
  }
}

export type NonWorkingDayEntry = {
  id: string
  /** "YYYY-MM-DD" */
  date: string
  reason: string | null
}

/** 해당 연도에 등록된 제외 날짜 목록을 조회합니다. (ADMIN 전용) */
export async function getYearNonWorkingDays(year: string): Promise<NonWorkingDayEntry[]> {
  await requireAdmin()

  const { start, end } = yearRangeUtc(year)
  const rows = await prisma.nonWorkingDay.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  })

  return rows.map((row) => ({
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    reason: row.reason,
  }))
}

/** 해당 연도 1~12월의 총일수/근무일수/휴일수 요약을 계산합니다. (ADMIN 전용) */
export async function getYearWorkingDaySummary(year: string): Promise<MonthWorkingDayInfo[]> {
  const entries = await getYearNonWorkingDays(year)
  const excludedDates = new Set(entries.map((e) => e.date))

  return Array.from({ length: 12 }, (_, i) => {
    const targetMonth = `${year}-${String(i + 1).padStart(2, "0")}`
    return getMonthWorkingDayInfo(targetMonth, excludedDates)
  })
}

/**
 * 특정 월의 근무일수를 계산합니다. 다른 액션(투입 MM 자동산출, 가동률 계산 등)에서 사용합니다.
 */
export async function getWorkingDayInfo(targetMonth: string): Promise<MonthWorkingDayInfo> {
  const [year] = targetMonth.split("-")
  const { start, end } = yearRangeUtc(year)
  const rows = await prisma.nonWorkingDay.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true },
  })
  const excludedDates = new Set(rows.map((r) => r.date.toISOString().slice(0, 10)))

  return getMonthWorkingDayInfo(targetMonth, excludedDates)
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다.")

export type NonWorkingDayState = {
  error?: string
  success?: boolean
}

/** 날짜를 워킹데이에서 제외 등록(또는 사유 수정)합니다. (ADMIN 전용) */
export async function upsertNonWorkingDay(
  date: string,
  reason: string
): Promise<NonWorkingDayState> {
  await requireAdmin()

  const parsed = dateSchema.safeParse(date)
  if (!parsed.success) {
    return { error: "날짜 형식을 확인하세요." }
  }

  try {
    await prisma.nonWorkingDay.upsert({
      where: { date: new Date(`${date}T00:00:00.000Z`) },
      update: { reason: reason || null },
      create: { date: new Date(`${date}T00:00:00.000Z`), reason: reason || null },
    })
  } catch (error) {
    console.error("[upsertNonWorkingDay]", error)
    return { error: "저장 중 오류가 발생했습니다." }
  }

  revalidatePath("/working-days")
  return { success: true }
}

/** 제외 등록을 취소합니다(다시 근무일로 되돌림). (ADMIN 전용) */
export async function removeNonWorkingDay(date: string): Promise<NonWorkingDayState> {
  await requireAdmin()

  const parsed = dateSchema.safeParse(date)
  if (!parsed.success) {
    return { error: "날짜 형식을 확인하세요." }
  }

  try {
    await prisma.nonWorkingDay.delete({
      where: { date: new Date(`${date}T00:00:00.000Z`) },
    })
  } catch (error) {
    console.error("[removeNonWorkingDay]", error)
    return { error: "삭제 중 오류가 발생했습니다." }
  }

  revalidatePath("/working-days")
  return { success: true }
}
