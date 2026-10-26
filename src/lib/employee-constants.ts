/** 등급 체계(초급/중급/고급/특급)는 grade-option.actions.ts의 GRADE_ORDER와 동일한 고정 목록입니다. */
export const GRADE_LABEL_EN: Record<string, string> = {
  초급: "Junior",
  중급: "Senior",
  고급: "Professional",
  특급: "Master",
}

export const EMP_TYPE_OPTIONS = [
  { value: "REGULAR", label: "정규직" },
  { value: "CONTRACT", label: "계약직" },
] as const

export const EMP_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  EMP_TYPE_OPTIONS.map((option) => [option.value, option.label])
)

/**
 * "asOf" 기준 사실상 퇴사일입니다. resignDate가 입력돼 있으면 그 값을 그대로 씁니다.
 * 계약만료로 나간 계약직은 resignDate를 따로 입력하지 않고 contractEndDate만 지난
 * 채로 두는 경우가 실제로 있어서, 계약직이면서 contractEndDate가 asOf보다 과거인
 * 경우도 그 contractEndDate를 퇴사일로 취급합니다. 아직 재직 중이면 null입니다.
 * (empType 자체는 정규직/계약직 이력을 보존하기 위해 건드리지 않습니다.)
 * asOf를 생략하면 오늘 날짜 기준으로 판단합니다 — 가동률처럼 과거/미래 특정 시점
 * 기준으로 판단해야 하는 곳에서는 asOf에 그 날짜를 넘기세요.
 */
export function getEffectiveResignDate(
  employee: {
    empType: string
    resignDate: Date | null
    contractEndDate: Date | null
  },
  asOf: Date = new Date()
): Date | null {
  if (employee.resignDate) return employee.resignDate
  if (
    employee.empType === "CONTRACT" &&
    employee.contractEndDate &&
    employee.contractEndDate < asOf
  ) {
    return employee.contractEndDate
  }
  return null
}

/**
 * 가동률 "계획" 모드 전용 가용 종료일입니다. 실제 구분(getEmploymentStatusLabel)이나
 * "확정" 가동률에는 절대 쓰지 마세요 — 오직 /utilization의 계획 모드 계산에서만 씁니다.
 * 계약 만료(contractEndDate) 이후라도 plannedActiveUntil까지는 계약 연장/전환을
 * 전제로 계획상 가용 인력으로 취급합니다(HR 알림용 contractEndDate 자체는 그대로 둠).
 */
export function getPlanningEffectiveResignDate(
  employee: {
    empType: string
    resignDate: Date | null
    contractEndDate: Date | null
    plannedActiveUntil: Date | null
  },
  asOf: Date = new Date()
): Date | null {
  if (employee.resignDate) return employee.resignDate
  if (
    employee.empType === "CONTRACT" &&
    employee.contractEndDate &&
    employee.contractEndDate < asOf
  ) {
    if (employee.plannedActiveUntil && employee.plannedActiveUntil >= asOf) return null
    return employee.plannedActiveUntil ?? employee.contractEndDate
  }
  return null
}

/** 직원 목록 등에 표시할 구분(정규직/계약직/퇴사자)을 판정합니다. */
export function getEmploymentStatusLabel(
  employee: {
    empType: string
    resignDate: Date | null
    contractEndDate: Date | null
  },
  asOf: Date = new Date()
): "정규직" | "계약직" | "퇴사자" {
  const effectiveResignDate = getEffectiveResignDate(employee, asOf)
  if (effectiveResignDate && effectiveResignDate <= asOf) return "퇴사자"
  return employee.empType === "REGULAR" ? "정규직" : "계약직"
}

/**
 * 입사일 기준 우리 회사 근속 개월수(등급 산정용)입니다. 퇴사자는 실제 퇴사일까지만
 * 계산하고, 재직 중이면 asOf(기본값 오늘)까지 계산합니다 — 저장하지 않고 조회 시점마다
 * 다시 계산하는 값이라, 시간이 지나면 저장 없이도 자동으로 늘어납니다.
 */
export function getTenureMonths(
  employee: {
    joinDate: Date
    empType: string
    resignDate: Date | null
    contractEndDate: Date | null
  },
  asOf: Date = new Date()
): number {
  const effectiveResignDate = getEffectiveResignDate(employee, asOf)
  const endDate = effectiveResignDate && effectiveResignDate < asOf ? effectiveResignDate : asOf
  if (employee.joinDate >= endDate) return 0

  let months =
    (endDate.getFullYear() - employee.joinDate.getFullYear()) * 12 +
    (endDate.getMonth() - employee.joinDate.getMonth())
  if (endDate.getDate() < employee.joinDate.getDate()) months -= 1
  return Math.max(0, months)
}
