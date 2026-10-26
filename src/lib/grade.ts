import { addMonths } from "date-fns"

export type GradeCriterionLike = { gradeName: string; requiredMonths: number }

/** 총 환산개월수 기준으로 충족하는 등급 중 가장 높은(요구개월수가 큰) 등급명을 추천합니다. */
export function suggestGrade(
  totalMonths: number,
  criteria: GradeCriterionLike[]
): string | null {
  let best: GradeCriterionLike | null = null
  for (const criterion of criteria) {
    if (totalMonths < criterion.requiredMonths) continue
    if (!best || criterion.requiredMonths > best.requiredMonths) {
      best = criterion
    }
  }
  return best?.gradeName ?? null
}

export type GradeProjection<T extends { requiredMonths: number }> = T & {
  status: "met" | "resigned" | "projected"
  /** status가 "projected"일 때만 값이 있습니다. */
  projectedDate: Date | null
}

/**
 * 등급별(초급 제외) 예상 달성일을 계산합니다. 근속은 매달 자동으로 늘어나므로, 요구
 * 개월수까지 근속이 몇 개월 더 필요한지 역산해 입사일에 더합니다. 학력/자격증/타사경력
 * (fixedMonths)만으로 이미 충족했으면 "met", 퇴사해서 더 이상 근속이 늘지 않으면
 * "resigned"을 반환합니다. (직원 상세 "등급 관리" 탭 + 알림 생성 양쪽에서 재사용)
 */
export function computeGradeProjections<T extends { requiredMonths: number }>(
  criteria: T[],
  fixedMonths: number,
  tenureMonths: number,
  joinDate: Date,
  isResigned: boolean
): GradeProjection<T>[] {
  return criteria
    .filter((c) => c.requiredMonths > 0)
    .map((c) => {
      const requiredTenure = c.requiredMonths - fixedMonths
      if (requiredTenure <= tenureMonths) {
        return { ...c, status: "met" as const, projectedDate: null }
      }
      if (isResigned) {
        return { ...c, status: "resigned" as const, projectedDate: null }
      }
      return {
        ...c,
        status: "projected" as const,
        projectedDate: addMonths(joinDate, requiredTenure),
      }
    })
}
