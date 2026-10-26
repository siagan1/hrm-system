"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { ProjectMmSummary } from "@/actions/dashboard.actions"

/** 범례/툴팁에 쓸 전체 이름은 유지하되, Y축 라벨만 길면 줄여서 겹침을 방지합니다. */
function truncateName(name: string, max = 16) {
  return name.length > max ? `${name.slice(0, max)}…` : name
}

/**
 * Recharts의 기본 Y축 category tick은 내부적으로 라벨을 자체 폭 계산으로
 * 다시 줄여버려서(width prop과 무관하게) 한글 프로젝트명이 과도하게 짧게 잘립니다.
 * 직접 <text>를 그려서 그 자동 축약을 우회합니다.
 */
function CategoryTick({
  x,
  y,
  payload,
}: {
  x?: number
  y?: number
  payload?: { value: string }
}) {
  if (x === undefined || y === undefined || !payload) return null
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={11}
      className="fill-foreground"
    >
      {truncateName(payload.value)}
    </text>
  )
}

export function ProjectMmChart({ data }: { data: ProjectMmSummary[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={<CategoryTick />}
          width={140}
        />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="contractMm" name="계약 MM" fill="var(--color-muted-foreground)" radius={[0, 4, 4, 0]} />
        <Bar dataKey="inputMm" name="투입 MM" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
