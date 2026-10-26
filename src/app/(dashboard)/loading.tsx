import { IconLoader2 } from "@tabler/icons-react"

export default function DashboardLoading() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
      <IconLoader2 className="size-6 animate-spin" />
      <p className="text-sm">불러오는 중입니다...</p>
    </div>
  )
}
