"use client"

import { useActionState } from "react"

import { updateProject, type ProjectState } from "@/actions/project.actions"
import { Button } from "@/components/ui/button"
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

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return ""
  return date.toISOString().slice(0, 10)
}

type EditableProject = {
  id: string
  projectCode: string | null
  name: string
  clientName: string
  location: string | null
  startDate: Date
  endDate: Date | null
  totalContractMm: number | null
  parentProjectId: string | null
}

type MasterProject = {
  id: string
  projectCode: string | null
  name: string
}

export function ProjectBasicInfoForm({
  project,
  masterProjects,
  hasSubProjects,
}: {
  project: EditableProject
  masterProjects: MasterProject[]
  hasSubProjects: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    updateProject,
    initialState
  )
  const formKey = useFormRemountKey(state)

  return (
    <form key={formKey} action={formAction} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="projectId" value={project.id} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="projectCode">프로젝트 코드</Label>
        <Input
          id="projectCode"
          name="projectCode"
          placeholder="선택 입력"
          defaultValue={state.values?.projectCode ?? project.projectCode ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">프로젝트명</Label>
        <Input
          id="name"
          name="name"
          defaultValue={state.values?.name ?? project.name}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="clientName">발주처</Label>
        <Input
          id="clientName"
          name="clientName"
          defaultValue={state.values?.clientName ?? project.clientName}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="parentProjectId">상위 프로젝트</Label>
        {hasSubProjects ? (
          <p className="text-sm text-muted-foreground">
            이 프로젝트는 하위 프로젝트를 보유하고 있어 다른 프로젝트의 하위로
            지정할 수 없습니다.
          </p>
        ) : (
          <Select
            name="parentProjectId"
            defaultValue={
              state.values?.parentProjectId ??
              project.parentProjectId ??
              NONE_VALUE
            }
          >
            <SelectTrigger id="parentProjectId" className="w-full">
              <SelectValue placeholder="없음 (최상위 프로젝트)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>
                없음 (최상위 프로젝트)
              </SelectItem>
              {masterProjects
                .filter((master) => master.id !== project.id)
                .map((master) => (
                  <SelectItem key={master.id} value={master.id}>
                    {master.name}
                    {master.projectCode ? ` (${master.projectCode})` : ""}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="location">근무지</Label>
        <Input
          id="location"
          name="location"
          defaultValue={state.values?.location ?? project.location ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">시작일</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={
              state.values?.startDate ?? toDateInputValue(project.startDate)
            }
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">종료일</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={
              state.values?.endDate ?? toDateInputValue(project.endDate)
            }
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
          placeholder="선택 입력"
          defaultValue={state.values?.totalContractMm ?? project.totalContractMm ?? ""}
        />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm font-medium text-emerald-600">
          저장되었습니다.
        </p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  )
}
