"use client"

import dynamic from "next/dynamic"

import type { DashboardGridInnerProps } from "@/components/dashboard/dashboard-grid-inner"

const DashboardGridInner = dynamic<DashboardGridInnerProps>(
  () =>
    import("@/components/dashboard/dashboard-grid-inner").then(
      (mod) => mod.DashboardGridInner
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        대시보드를 불러오는 중...
      </div>
    ),
  }
)

export function DashboardGrid(props: DashboardGridInnerProps) {
  return <DashboardGridInner {...props} />
}
