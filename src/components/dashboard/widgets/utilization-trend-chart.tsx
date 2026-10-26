"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { UtilizationTrendPoint } from "@/actions/dashboard.actions"

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
]

function TrendDot({
  cx,
  cy,
  index,
  belowTarget,
  isCurrentMonth,
}: {
  cx?: number
  cy?: number
  index?: number
  belowTarget: boolean[]
  isCurrentMonth: (i: number) => boolean
}) {
  if (cx === undefined || cy === undefined || index === undefined) return null
  const below = belowTarget[index]
  const current = isCurrentMonth(index)
  return (
    <circle
      cx={cx}
      cy={cy}
      r={current ? 6 : 3}
      className={below ? "fill-destructive" : "fill-foreground"}
      stroke={current ? "var(--color-background)" : "none"}
      strokeWidth={current ? 2 : 0}
    />
  )
}

function TrendValueLabel({
  x,
  y,
  value,
  index,
  belowTarget,
  isCurrentMonth,
}: {
  x?: number
  y?: number
  value?: number | string
  index?: number
  belowTarget: boolean[]
  isCurrentMonth: (i: number) => boolean
}) {
  if (x === undefined || y === undefined || index === undefined) return null
  if (value === null || value === undefined || value === "") return null
  const current = isCurrentMonth(index)
  const below = belowTarget[index]
  return (
    <text
      x={x}
      y={y - (current ? 14 : 10)}
      textAnchor="middle"
      fontSize={current ? 12 : 10}
      fontWeight={current ? 700 : 500}
      className={below ? "fill-destructive" : "fill-foreground"}
    >
      {value}%
    </text>
  )
}

function MonthTick({
  x,
  y,
  payload,
  index,
  currentMonthIndex,
}: {
  x?: number
  y?: number
  payload?: { value: string }
  index?: number
  currentMonthIndex: number
}) {
  if (x === undefined || y === undefined || !payload || index === undefined) return null
  const current = index === currentMonthIndex
  return (
    <text
      x={x}
      y={y + 12}
      textAnchor="middle"
      fontSize={current ? 12 : 11}
      fontWeight={current ? 700 : 400}
      className={current ? "fill-primary" : "fill-muted-foreground"}
    >
      {payload.value}
    </text>
  )
}

export function UtilizationTrendChart({
  points,
  targetRate,
  currentMonthIndex,
}: {
  points: UtilizationTrendPoint[]
  targetRate: number | null
  currentMonthIndex: number
}) {
  const data = points.map((p, i) => ({
    month: MONTH_LABELS[i],
    rate: p.utilizationRate !== null ? Math.round(p.utilizationRate * 1000) / 10 : null,
  }))
  const belowTarget = points.map((p) => p.belowTarget)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        {/* 양 끝 점의 값 라벨(예: 1월 98%, 12월 97%)과 월 라벨이 Y축에 겹치거나 카드 밖으로
            잘리지 않도록 X축 양쪽에 여백을 둡니다. */}
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          interval={0}
          padding={{ left: 16, right: 16 }}
          tick={<MonthTick currentMonthIndex={currentMonthIndex} />}
        />
        {/* "120%"처럼 세 자리 라벨이 잘리지 않도록 폭을 넉넉히 둡니다. */}
        <YAxis tick={{ fontSize: 11 }} width={40} unit="%" axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => `${value}%`} />
        {targetRate !== null && (
          <ReferenceLine
            y={Math.round(targetRate * 1000) / 10}
            strokeDasharray="4 4"
            className="stroke-muted-foreground"
          />
        )}
        <Line
          type="monotone"
          dataKey="rate"
          stroke="var(--color-foreground)"
          strokeWidth={2}
          isAnimationActive={false}
          dot={
            <TrendDot
              belowTarget={belowTarget}
              isCurrentMonth={(i) => i === currentMonthIndex}
            />
          }
          label={
            <TrendValueLabel
              belowTarget={belowTarget}
              isCurrentMonth={(i) => i === currentMonthIndex}
            />
          }
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
