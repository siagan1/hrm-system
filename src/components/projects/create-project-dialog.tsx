"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createProject,
  type ProjectState,
} from "@/actions/project.actions"
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

const initialState: ProjectState = {}
const NONE_VALUE = "__none__"

type MasterProject = {
  id: string
  projectCode: string | null
  name: string
}

export function CreateProjectDialog({
  masterProjects = [],
  lockedParent,
}: {
  masterProjects?: MasterProject[]
  lockedParent?: { id: string; name: string }
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(
    createProject,
    initialState
  )
  const formKey = useFormRemountKey(state)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      toast.success("프로젝트가 등록되었습니다.")
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{lockedParent ? "하위 프로젝트 등록" : "프로젝트 등록"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {lockedParent ? "하위 프로젝트 등록" : "프로젝트 등록"}
          </DialogTitle>
        </DialogHeader>

        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="projectCode">프로젝트 코드</Label>
              <Input
                id="projectCode"
                name="projectCode"
                placeholder="선택 입력"
                defaultValue={state.values?.projectCode}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="clientName">발주처</Label>
              <Input
                id="clientName"
                name="clientName"
                placeholder="예: SKB, KT"
                defaultValue={state.values?.clientName}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">프로젝트명</Label>
            <Input id="name" name="name" defaultValue={state.values?.name} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="parentProjectId">상위 프로젝트</Label>
            {lockedParent ? (
              <>
                <Input value={lockedParent.name} disabled />
                <input
                  type="hidden"
                  name="parentProjectId"
                  value={lockedParent.id}
                />
              </>
            ) : (
              <Select
                name="parentProjectId"
                defaultValue={state.values?.parentProjectId ?? NONE_VALUE}
              >
                <SelectTrigger id="parentProjectId" className="w-full">
                  <SelectValue placeholder="없음 (최상위 프로젝트)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>
                    없음 (최상위 프로젝트)
                  </SelectItem>
                  {masterProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                      {project.projectCode ? ` (${project.projectCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              예: &quot;26년 알티미디어 용역 검증&quot; 계약 하나에 여러 하위
              프로젝트를 등록해 관리할 때 사용하세요.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="location">근무지</Label>
            <Input id="location" name="location" defaultValue={state.values?.location} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={state.values?.startDate}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">종료일</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={state.values?.endDate}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="totalContractMm">계약 공수 (MM)</Label>
            <Input
              id="totalContractMm"
              name="totalContractMm"
              type="number"
              min={0}
              step="0.01"
              placeholder="선택 입력 — 나중에 채워도 됩니다"
              defaultValue={state.values?.totalContractMm}
            />
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
