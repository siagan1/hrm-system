"use client"

import { useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function YearFilter({ year }: { year: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 3 + i))
  if (!years.includes(year)) years.unshift(year)

  return (
    <Select
      value={year}
      onValueChange={(value) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("year", value)
        router.push(`/utilization?${params.toString()}`)
      }}
    >
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={y}>
            {y}년
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
