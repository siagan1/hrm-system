import type { ReactNode } from "react"

import { getUserDashboardLayout } from "@/actions/dashboard.actions"
import { applyDueNotificationChecks } from "@/actions/notification.actions"
import { DashboardGrid } from "@/components/dashboard/dashboard-grid"
import { HeadcountSummaryWidget } from "@/components/dashboard/widgets/headcount-summary-widget"
import { ProjectMmWidget } from "@/components/dashboard/widgets/project-mm-widget"
import { LpRecentWidget } from "@/components/dashboard/widgets/lp-recent-widget"
import { UtilizationTrendWidget } from "@/components/dashboard/widgets/utilization-trend-widget"
import { NoWorkTrendWidget } from "@/components/dashboard/widgets/nowork-trend-widget"
import { HeadcountCompositionWidget } from "@/components/dashboard/widgets/headcount-composition-widget"
import { HiresResignationsWidget } from "@/components/dashboard/widgets/hires-resignations-widget"
import { HrCommitteeWidget } from "@/components/dashboard/widgets/hr-committee-widget"
import { GradeUpgradeWidget } from "@/components/dashboard/widgets/grade-upgrade-widget"
import { WeeklyNoteWidget } from "@/components/dashboard/widgets/weekly-note-widget"
import { TeamUtilizationWidget } from "@/components/dashboard/widgets/team-utilization-widget"
import { GradeDistributionWidget } from "@/components/dashboard/widgets/grade-distribution-widget"
import { OverAllocationWidget } from "@/components/dashboard/widgets/over-allocation-widget"
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/dashboard-defaults"
import { isManagerOrAbove } from "@/lib/auth-utils"

const WIDGET_COMPONENTS: Record<string, () => ReactNode> = {
  summary: () => <HeadcountSummaryWidget />,
  "project-mm": () => <ProjectMmWidget />,
  "lp-recent": () => <LpRecentWidget />,
  "utilization-trend": () => <UtilizationTrendWidget />,
  "nowork-trend": () => <NoWorkTrendWidget />,
  "headcount-composition": () => <HeadcountCompositionWidget />,
  "hires-resignations": () => <HiresResignationsWidget />,
  "hr-committee": () => <HrCommitteeWidget />,
  "grade-upgrade": () => <GradeUpgradeWidget />,
  "weekly-note": () => <WeeklyNoteWidget />,
  "team-utilization": () => <TeamUtilizationWidget />,
  "grade-distribution": () => <GradeDistributionWidget />,
  "over-allocation": () => <OverAllocationWidget />,
}

export default async function DashboardHomePage() {
  const canManage = await isManagerOrAbove()
  if (canManage) {
    await applyDueNotificationChecks()
  }

  const savedLayout = await getUserDashboardLayout()
  const layout = savedLayout.length > 0 ? savedLayout : DEFAULT_DASHBOARD_LAYOUT

  const widgets: Record<string, ReactNode> = {}
  for (const item of layout) {
    const render = WIDGET_COMPONENTS[item.i]
    if (render) widgets[item.i] = render()
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">대시보드</h1>
        <p className="text-sm text-muted-foreground">
          위젯을 자유롭게 배치하고 저장할 수 있습니다.
        </p>
      </div>

      <DashboardGrid initialLayout={layout} widgets={widgets} canManage={canManage} />
    </div>
  )
}
