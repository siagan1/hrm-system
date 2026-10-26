"use client"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

import { useState, type ReactNode } from "react"
import ReactGridLayout, {
  useContainerWidth,
  type Layout,
} from "react-grid-layout"
import {
  IconDeviceFloppy,
  IconLayoutGrid,
  IconLock,
  IconLockOpen,
  IconX,
} from "@tabler/icons-react"

import { saveUserDashboardLayout } from "@/actions/dashboard.actions"
import { Button } from "@/components/ui/button"
import { WidgetPickerDialog } from "@/components/dashboard/widget-picker-dialog"

export type DashboardGridInnerProps = {
  initialLayout: Layout
  widgets: Record<string, ReactNode>
  canManage: boolean
}

const GRID_COLS = 12

/**
 * 왼쪽 위부터 순서대로 채워나가는 선반(shelf) 배치입니다. 현재 보이는 순서(위→아래,
 * 왼쪽→오른쪽)를 유지한 채, 각 위젯의 너비만큼 한 행을 채우다가 남은 폭이 모자라면
 * 다음 행으로 넘어갑니다 — 위젯을 추가/삭제/크기조절하며 생긴 빈틈을 한 번에 정리할
 * 때 씁니다.
 */
function autoArrange(layout: Layout): Layout {
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x)
  let cursorX = 0
  let cursorY = 0
  let rowHeight = 0

  return sorted.map((item) => {
    if (cursorX + item.w > GRID_COLS) {
      cursorX = 0
      cursorY += rowHeight
      rowHeight = 0
    }
    const placed = { ...item, x: cursorX, y: cursorY }
    cursorX += item.w
    rowHeight = Math.max(rowHeight, item.h)
    return placed
  })
}

export function DashboardGridInner({
  initialLayout,
  widgets,
  canManage,
}: DashboardGridInnerProps) {
  const [layout, setLayout] = useState<Layout>(initialLayout)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const { width, containerRef, mounted } = useContainerWidth()

  async function persist(next: Layout) {
    setIsSaving(true)
    setSaveMessage(null)
    const result = await saveUserDashboardLayout(JSON.stringify(next))
    setIsSaving(false)
    setSaveMessage(result.error ?? "배치가 저장되었습니다.")
  }

  function removeWidget(id: string) {
    const next = layout.filter((item) => item.i !== id)
    setLayout(next)
    void persist(next)
  }

  function handleAutoArrange() {
    const next = autoArrange(layout)
    setLayout(next)
    void persist(next)
  }

  // 위젯 목록에 있지만 아직 데이터(ReactNode)를 못 받은 경우(막 추가돼 새로고침 전)를
  // 대비해 렌더 가능한 항목만 그립니다.
  const renderableLayout = layout.filter((item) => widgets[item.i] !== undefined)

  // react-grid-layout은 renderableLayout(위젯 데이터가 아직 없어 일부러 뺀, layout의
  // 부분집합)을 기준으로 onLayoutChange를 호출합니다. 이걸 그대로 setLayout에 넘기면
  // 아직 데이터가 안 온 위젯이 layout 상태에서 영구히 사라져버립니다(제거가 아니라
  // 단순 지연인데도). 그래서 들어온 값으로 좌표만 갱신하고, 빠진 항목은 그대로 보존합니다.
  function handleLayoutChange(updated: Layout) {
    setLayout((prev) => {
      const updatedMap = new Map(updated.map((item) => [item.i, item]))
      return prev.map((item) => updatedMap.get(item.i) ?? item)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-3">
        {saveMessage && (
          <span className="text-sm text-muted-foreground">{saveMessage}</span>
        )}
        {isEditing && (
          <WidgetPickerDialog
            currentWidgetIds={layout.map((item) => item.i)}
            canManage={canManage}
            onAdded={setLayout}
          />
        )}
        {isEditing && (
          <Button type="button" variant="outline" size="sm" onClick={handleAutoArrange}>
            <IconLayoutGrid className="size-4" />
            자동 정렬
          </Button>
        )}
        <Button
          type="button"
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setIsEditing((prev) => !prev)
            setSaveMessage(null)
          }}
        >
          {isEditing ? (
            <IconLockOpen className="size-4" />
          ) : (
            <IconLock className="size-4" />
          )}
          {isEditing ? "편집 중 (잠그기)" : "위젯 편집"}
        </Button>
        {isEditing && (
          <Button
            type="button"
            size="sm"
            onClick={() => persist(layout)}
            disabled={isSaving}
          >
            <IconDeviceFloppy className="size-4" />
            {isSaving ? "저장 중..." : "배치 저장"}
          </Button>
        )}
      </div>

      <div ref={containerRef}>
        {mounted && (
          <ReactGridLayout
            width={width}
            layout={renderableLayout}
            gridConfig={{ cols: 12, rowHeight: 30, margin: [16, 16] }}
            dragConfig={{ enabled: isEditing }}
            resizeConfig={{ enabled: isEditing }}
            onLayoutChange={handleLayoutChange}
          >
            {renderableLayout.map((item) => (
              <div
                key={item.i}
                className="relative h-full overflow-hidden rounded-lg border bg-background p-4 shadow-sm"
              >
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => removeWidget(item.i)}
                    aria-label="위젯 제거"
                  >
                    <IconX className="size-4" />
                  </Button>
                )}
                {widgets[item.i]}
              </div>
            ))}
          </ReactGridLayout>
        )}
      </div>
    </div>
  )
}
