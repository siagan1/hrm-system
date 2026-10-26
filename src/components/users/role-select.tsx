"use client"

import { useState, useTransition } from "react"

import { updateUserRole } from "@/actions/user.actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "관리자" },
  { value: "MANAGER", label: "매니저" },
  { value: "USER", label: "사용자" },
]

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string
  role: string
  disabled?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(role)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <Select
        value={value}
        disabled={disabled || isPending}
        onValueChange={(next) => {
          const previous = value
          setValue(next)
          setError(null)
          startTransition(async () => {
            const result = await updateUserRole(userId, next)
            if (result.error) {
              setValue(previous)
              setError(result.error)
            }
          })
        }}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
