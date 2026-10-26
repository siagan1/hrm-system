"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DateFilter({ date }: { date: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="targetDate">기준 날짜</Label>
      <Input
        id="targetDate"
        type="date"
        defaultValue={date}
        className="w-44"
        onChange={(e) => {
          if (!e.target.value) return
          const params = new URLSearchParams(searchParams.toString())
          params.set("date", e.target.value)
          params.delete("page")
          router.push(`/utilization?${params.toString()}`)
        }}
      />
    </div>
  )
}
