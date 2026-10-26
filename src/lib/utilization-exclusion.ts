export type UtilizationOverrideLike = {
  mode: "INCLUDE" | "EXCLUDE"
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
}

/**
 * 특정 날짜에 이 직원이 가동률 집계 대상인지 판정합니다.
 * 그 날짜를 포함하는 예외 기간(override)이 있으면 그 mode를 따르고(여러 개 겹치면
 * 가장 최근 등록분 우선), 없으면 직원의 기본 상태(excludedFromUtilization)를 따릅니다.
 * override의 startDate/endDate가 null이면 각각 "처음부터"/"계속"을 의미합니다.
 */
export function isIncludedInUtilization(
  excludedFromUtilization: boolean,
  overrides: UtilizationOverrideLike[],
  date: Date
): boolean {
  const applicable = overrides
    .filter((o) => {
      if (o.startDate && date < o.startDate) return false
      if (o.endDate && date > o.endDate) return false
      return true
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  if (applicable.length > 0) {
    return applicable[0].mode === "INCLUDE"
  }

  return !excludedFromUtilization
}
