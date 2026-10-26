"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createUserAccount,
  type CreateUserState,
} from "@/actions/user.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFormRemountKey } from "@/hooks/use-form-remount-key"

const initialState: CreateUserState = {}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "관리자" },
  { value: "MANAGER", label: "매니저" },
  { value: "USER", label: "사용자" },
]

type UnlinkedEmployee = {
  id: string
  name: string
  email: string | null
}

export function CreateUserDialog({
  unlinkedEmployees,
}: {
  unlinkedEmployees: UnlinkedEmployee[]
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(
    createUserAccount,
    initialState
  )
  const formKey = useFormRemountKey(state)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      toast.success("계정이 등록되었습니다.")
    }
  }, [state])

  function handleEmployeeChange(employeeId: string) {
    setSelectedEmployeeId(employeeId)
    const employee = unlinkedEmployees.find((e) => e.id === employeeId)
    setEmail(employee?.email ?? "")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>HRM 사용 권한 부여</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>HRM 사용 권한 부여</DialogTitle>
        </DialogHeader>

        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="employeeId">직원 선택</Label>
            <Select
              name="employeeId"
              defaultValue={state.values?.employeeId}
              onValueChange={handleEmployeeChange}
              required
            >
              <SelectTrigger id="employeeId" className="w-full">
                <SelectValue placeholder="HRM을 사용할 직원을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {unlinkedEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                    {employee.email ? ` (${employee.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unlinkedEmployees.length === 0 && (
              <p className="text-xs text-muted-foreground">
                로그인 계정이 없는 직원이 없습니다.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">로그인 이메일 (회사 이메일 기본값)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={state.values?.email ?? email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                selectedEmployeeId
                  ? "이메일 정보가 없습니다. 직접 입력하세요."
                  : "직원을 먼저 선택하세요"
              }
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">초기 비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role">권한</Label>
            <Select
              name="role"
              defaultValue={state.values?.role ?? "USER"}
              required
            >
              <SelectTrigger id="role" className="w-full">
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
          </div>

          {state.error && (
            <p className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "부여 중..." : "권한 부여"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
