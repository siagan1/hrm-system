"use client"

import { useState } from "react"
import { IconFileSpreadsheet } from "@tabler/icons-react"

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

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function ExportProjectsDialog() {
  const [open, setOpen] = useState(false)
  const thisMonth = currentYearMonth()
  const yearStart = `${thisMonth.slice(0, 4)}-01`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <IconFileSpreadsheet className="size-4" />
          전체 내보내기
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>투입내역 엑셀 내보내기</DialogTitle>
        </DialogHeader>

        <form
          method="GET"
          action="/api/projects/export"
          target="_blank"
          className="flex flex-col gap-4"
          onSubmit={() => setOpen(false)}
        >
          <p className="text-sm text-muted-foreground">
            하위 프로젝트가 있는 프로젝트는 상위 프로젝트명으로 합쳐서 인원별 투입
            공수를 정리합니다.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="export-from">시작월</Label>
              <Input
                id="export-from"
                name="from"
                type="month"
                defaultValue={yearStart}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="export-to">종료월</Label>
              <Input
                id="export-to"
                name="to"
                type="month"
                defaultValue={thisMonth}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">다운로드</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
