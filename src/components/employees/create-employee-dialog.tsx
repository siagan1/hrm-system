"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createEmployee,
  type CreateEmployeeState,
} from "@/actions/employee.actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { EMP_TYPE_OPTIONS } from "@/lib/employee-constants"

const initialState: CreateEmployeeState = {}
const NONE_TEAM_VALUE = "__none__"

type Team = {
  id: string
  teamName: string
}

export function CreateEmployeeDialog({ teams }: { teams: Team[] }) {
  const [open, setOpen] = useState(false)
  const [createsAccount, setCreatesAccount] = useState(false)
  const [state, formAction, isPending] = useActionState(
    createEmployee,
    initialState
  )
  const formKey = useFormRemountKey(state)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      toast.success("직원이 등록되었습니다.")
    }
  }, [state])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button>직원 등록</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>직원 등록</DialogTitle>
        </DialogHeader>

        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" defaultValue={state.values?.name} required />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="createsAccount"
              checked={createsAccount}
              onCheckedChange={(checked) => setCreatesAccount(checked === true)}
            />
            <Label htmlFor="createsAccount" className="font-normal">
              로그인 계정도 생성 (팀장/관리자 등 시스템에 로그인할 직원만 체크)
            </Label>
          </div>

          {createsAccount && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">이메일 (로그인 계정)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={state.values?.email}
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
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="empType">구분</Label>
            <Select name="empType" defaultValue={state.values?.empType} required>
              <SelectTrigger id="empType" className="w-full">
                <SelectValue placeholder="구분 선택" />
              </SelectTrigger>
              <SelectContent>
                {EMP_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="joinDate">입사일</Label>
            <Input
              id="joinDate"
              name="joinDate"
              type="date"
              defaultValue={state.values?.joinDate}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="teamId">소속 팀</Label>
            <Select
              name="teamId"
              defaultValue={state.values?.teamId ?? NONE_TEAM_VALUE}
            >
              <SelectTrigger id="teamId" className="w-full">
                <SelectValue placeholder="팀 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_TEAM_VALUE}>
                  선택 안 함 (조직도 밖에서 관리 — 예: CEO)
                </SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.teamName}
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
              {isPending ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
