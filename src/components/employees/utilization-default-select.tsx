"use client"

import { useState, useTransition } from "react"

import { updateExcludedFromUtilization } from "@/actions/utilization-exclusion.actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const INCLUDED_VALUE = "included"
const EXCLUDED_VALUE = "excluded"

export function UtilizationDefaultSelect({
  employeeId,
  excludedFromUtilization,
}: {
  employeeId: string
  excludedFromUtilization: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(
    excludedFromUtilization ? EXCLUDED_VALUE : INCLUDED_VALUE
  )

  return (
    <Select
      value={value}
      disabled={isPending}
      onValueChange={(next) => {
        const previous = value
        setValue(next)
        startTransition(async () => {
          try {
            await updateExcludedFromUtilization(employeeId, next === EXCLUDED_VALUE)
          } catch (error) {
            console.error("[updateExcludedFromUtilization]", error)
            setValue(previous)
          }
        })
      }}
    >
      <SelectTrigger className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={INCLUDED_VALUE}>가동률 집계 대상 (기본)</SelectItem>
        <SelectItem value={EXCLUDED_VALUE}>가동률 제외 대상 (기본)</SelectItem>
      </SelectContent>
    </Select>
  )
}
