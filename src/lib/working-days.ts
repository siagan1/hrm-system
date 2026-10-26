export type MonthWorkingDayInfo = {
  targetMonth: string
  totalDays: number
  workingDays: number
  holidays: number
  /** 이 달의 평일(월~금) 중 휴일로 등록되어 근무일수에서 제외된 날짜("YYYY-MM-DD") 목록.
   *  calculateAvailableMm에 그대로 넘겨 분자(실제 근무한 날 수) 계산에도 반영합니다. */
  excludedWeekdays: string[]
}

/**
 * "YYYY-MM" 월의 총일수/근무일수/휴일수를 계산합니다.
 * 근무일수 = 평일(월~금) 중 excludedDates("YYYY-MM-DD" 집합)에 없는 날.
 * 휴일수는 totalDays - workingDays로 항상 앞뒤가 맞도록 파생시킵니다(주말 + 제외된 평일).
 */
export function getMonthWorkingDayInfo(
  targetMonth: string,
  excludedDates: ReadonlySet<string>
): MonthWorkingDayInfo {
  const [year, month] = targetMonth.split("-").map(Number)
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate()

  let workingDays = 0
  const excludedWeekdays: string[] = []
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(Date.UTC(year, month - 1, d))
    const day = date.getUTCDay()
    if (day === 0 || day === 6) continue
    const key = date.toISOString().slice(0, 10)
    if (excludedDates.has(key)) {
      excludedWeekdays.push(key)
    } else {
      workingDays++
    }
  }

  return {
    targetMonth,
    totalDays,
    workingDays,
    holidays: totalDays - workingDays,
    excludedWeekdays,
  }
}
