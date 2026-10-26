"use client"

import { useEffect } from "react"
import { IconAlertTriangle } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
      <IconAlertTriangle className="size-6 text-destructive" />
      <div>
        <p className="text-sm font-medium">문제가 발생했습니다.</p>
        <p className="text-sm text-muted-foreground">
          페이지를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </div>
      <Button variant="outline" onClick={retry}>
        다시 시도
      </Button>
    </div>
  )
}
