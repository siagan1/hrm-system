function toUtcDateOnly(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * 직원의 해당 월 가용MM(0~1)을 계산합니다.
 *
 * 방식: (그 달에 실제 근무한 평일 수, 휴일 제외) ÷ (그 달 워킹데이 근무일수), 최대 1로 clamp.
 * 재직 기간은 입사일(포함)부터 퇴사일(포함, 즉 퇴사일 당일까지 근무한 것으로 간주)까지입니다.
 *
 * 참고 자료(2026_HRM_계획 엑셀의 수기 계산값)와 대조해 검증한 방식입니다. excludedDates를
 * 넘기면(워킹데이 관리에 등록된 휴일) 분자에서도 그 날짜들을 제외해 분모(workingDays)와
 * 일관되게 맞춥니다 — 넘기지 않으면 과거 동작대로 주말만 제외합니다(분모와 어긋나
 * 한 달을 두 구간으로 나눠 합산할 때 실제보다 과투입으로 잘못 계산될 수 있으니, 가능하면
 * 항상 넘기세요. getWorkingDayInfo/getYearWorkingDaySummary의 반환값에 이미 포함되어 있습니다).
 */
export function calculateAvailableMm({
  joinDate,
  resignDate,
  targetMonth,
  workingDays,
  excludedDates,
  isIncludedOnDay,
}: {
  joinDate: Date
  resignDate: Date | null
  /** "YYYY-MM" */
  targetMonth: string
  workingDays: number
  /** 이 달의 휴일 날짜("YYYY-MM-DD") 목록 — MonthWorkingDayInfo.excludedWeekdays 참고. */
  excludedDates?: Iterable<string>
  /**
   * 대표/사업전략팀장처럼 원래 가동률 집계 대상이 아닌 인원, 또는 그 반대(휴직 등)를
   * 반영하기 위한 훅입니다. 주어진 날짜(UTC 자정 ms)가 집계 대상이면 true.
   * 생략하면 항상 대상(true)으로 취급합니다 — 재직 기간(입사~퇴사) 판정만 하던 기존 동작과 동일합니다.
   */
  isIncludedOnDay?: (dayMs: number) => boolean
}): number {
  if (workingDays <= 0) return 0

  const [year, month] = targetMonth.split("-").map(Number)
  const monthStartMs = Date.UTC(year, month - 1, 1)
  const monthEndMs = Date.UTC(year, month, 0)

  const joinMs = toUtcDateOnly(joinDate)
  const resignMs = resignDate ? toUtcDateOnly(resignDate) : null

  const effectiveStartMs = Math.max(monthStartMs, joinMs)
  const effectiveEndMs = resignMs !== null ? Math.min(monthEndMs, resignMs) : monthEndMs

  if (effectiveStartMs > effectiveEndMs) return 0

  if (effectiveStartMs === monthStartMs && effectiveEndMs === monthEndMs && !isIncludedOnDay) {
    return 1
  }

  const excludedSet = excludedDates ? new Set(excludedDates) : null
  const DAY_MS = 24 * 60 * 60 * 1000
  let workedDays = 0
  for (let t = effectiveStartMs; t <= effectiveEndMs; t += DAY_MS) {
    const day = new Date(t).getUTCDay()
    if (day === 0 || day === 6) continue
    if (excludedSet && excludedSet.has(new Date(t).toISOString().slice(0, 10))) continue
    if (isIncludedOnDay && !isIncludedOnDay(t)) continue
    workedDays++
  }

  return Math.min(1, Math.round((workedDays / workingDays) * 100) / 100)
}
