export type WidgetCatalogItem = {
  id: string
  label: string
  description: string
  defaultSize: { w: number; h: number }
  /** true면 ADMIN/MANAGER만 추가·조회할 수 있습니다(내부적으로 requireManager를 쓰는 위젯). */
  requiresManager?: boolean
}

/**
 * 대시보드에 추가할 수 있는 위젯 전체 목록입니다. 실제 렌더링(React 컴포넌트)은
 * page.tsx에서 이 id를 보고 매핑합니다 — 이 파일은 "위젯 추가" 피커(클라이언트)와
 * page.tsx(서버) 양쪽에서 공유하는 메타데이터만 담습니다.
 */
export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    id: "summary",
    label: "전사 인원 요약",
    description: "이번 달 총 인원수/투입 인원수/노워크 인원수.",
    defaultSize: { w: 12, h: 3 },
  },
  {
    id: "project-mm",
    label: "프로젝트별 MM 현황",
    description: "최근 시작한 프로젝트의 계약 MM 대비 누적 투입 MM.",
    defaultSize: { w: 7, h: 8 },
  },
  {
    id: "lp-recent",
    label: "LP 등록 현황",
    description: "최근 3개월 내 등록된 LP(성과개선) 기록.",
    defaultSize: { w: 5, h: 8 },
    requiresManager: true,
  },
  {
    id: "utilization-trend",
    label: "가동률 추이",
    description: "1~12월 가동률 추이, 이번 달 강조, 목표 미달 월 강조.",
    defaultSize: { w: 7, h: 8 },
    requiresManager: true,
  },
  {
    id: "nowork-trend",
    label: "노워크 인원",
    description: "이번 달부터 3개월간 월별로 가동 공수를 다 채우지 못한(완전 유휴 포함) 인원수와 명단.",
    defaultSize: { w: 5, h: 8 },
    requiresManager: true,
  },
  {
    id: "headcount-composition",
    label: "월별 인원 구성",
    description: "월별 정규직/계약직 인원 구성 추이.",
    defaultSize: { w: 6, h: 7 },
    requiresManager: true,
  },
  {
    id: "hires-resignations",
    label: "입사/퇴사 알림",
    description: "이번 달 입사자/퇴사자 명단.",
    defaultSize: { w: 6, h: 7 },
    requiresManager: true,
  },
  {
    id: "hr-committee",
    label: "인사위원회 필요인력",
    description: "설정된 사전알림 기간 내 정규직 전환/계약직 연장 대상자.",
    defaultSize: { w: 6, h: 7 },
    requiresManager: true,
  },
  {
    id: "grade-upgrade",
    label: "등급 상승 임박",
    description: "설정된 사전알림 기간 내 등급 상승이 예상되는 인원.",
    defaultSize: { w: 6, h: 7 },
    requiresManager: true,
  },
  {
    id: "weekly-note",
    label: "이번 주 특이사항",
    description: "주간보고용 자유 메모. 직접 입력해 저장합니다.",
    defaultSize: { w: 6, h: 6 },
    requiresManager: true,
  },
  {
    id: "team-utilization",
    label: "팀별 가동률 비교",
    description: "이번 달 팀별 가동률을 막대 그래프로 비교.",
    defaultSize: { w: 6, h: 7 },
    requiresManager: true,
  },
  {
    id: "grade-distribution",
    label: "등급 분포 현황",
    description: "재직자의 초급/중급/고급/특급 등급별 인원 분포.",
    defaultSize: { w: 6, h: 7 },
    requiresManager: true,
  },
  {
    id: "over-allocation",
    label: "과투입 인원",
    description: "이번 달 가용 공수보다 많이 투입된(과투입) 인원 명단.",
    defaultSize: { w: 6, h: 7 },
    requiresManager: true,
  },
]

export const WIDGET_CATALOG_MAP: Record<string, WidgetCatalogItem> = Object.fromEntries(
  WIDGET_CATALOG.map((item) => [item.id, item])
)
