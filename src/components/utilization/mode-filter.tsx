"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"

export function ModeFilter({ mode }: { mode: "actual" | "planned" }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setMode = (next: "actual" | "planned") => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === "actual") {
      params.delete("mode")
    } else {
      params.set("mode", next)
    }
    params.delete("page")
    router.push(`/utilization?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">모드</span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "actual" ? "default" : "outline"}
          onClick={() => setMode("actual")}
        >
          확정
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "planned" ? "default" : "outline"}
          onClick={() => setMode("planned")}
        >
          계획
        </Button>
      </div>
    </div>
  )
}
