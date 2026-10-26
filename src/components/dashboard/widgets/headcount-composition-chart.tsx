"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { HeadcountCompositionMonth } from "@/actions/dashboard.actions"

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
]

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

/**
 * 막대 조각 안에 인원수와, 그 아래 그 달 전체 대비 비율을 표시합니다. 조각이 두 줄을
 * 담기에 낮으면 인원수만, 한 줄도 안 되면 겹치지 않게 생략합니다.
 */
function SegmentCountLabel({
  x,
  y,
  width,
  height,
  value,
  index,
  totals,
  textClassName,
}: {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  value?: number | string
  index?: number
  totals: number[]
  textClassName: string
}) {
  const [nx, ny, nw, nh] = [x, y, width, height].map(Number)
  if ([nx, ny, nw, nh].some(Number.isNaN) || index === undefined) return null
  if (!value || nh < 14) return null

  const cx = nx + nw / 2
  const cy = ny + nh / 2
  const total = totals[index]
  const showRatio = nh >= 28 && total > 0

  if (!showRatio) {
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={600}
        className={textClassName}
      >
        {value}
      </text>
    )
  }

  return (
    <text textAnchor="middle" className={textClassName}>
      <tspan x={cx} y={cy - 6} dominantBaseline="central" fontSize={10} fontWeight={600}>
        {value}
      </tspan>
      <tspan x={cx} y={cy + 6} dominantBaseline="central" fontSize={9} opacity={0.8}>
        {Math.round((Number(value) / total) * 100)}%
      </tspan>
    </text>
  )
}

export function HeadcountCompositionChart({
  months,
  currentMonthIndex,
}: {
  months: HeadcountCompositionMonth[]
  currentMonthIndex: number
}) {
  const data = months.map((m, i) => ({
    month: MONTH_LABELS[i],
    정규직: m.regularCount,
    계약직: m.contractCount,
  }))
  const totals = months.map((m) => m.regularCount + m.contractCount)
  const currentMonthLabel = MONTH_LABELS[currentMonthIndex]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={<MonthTick currentMonthIndex={currentMonthIndex} />}
        />
        <YAxis tick={{ fontSize: 11 }} width={32} />
        <Tooltip formatter={(value) => `${value}명`} cursor={{ className: "fill-muted" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {/* 막대 색을 흐리게 하면 정규직/계약직 구분이 깨지므로, 이번 달은 뒤에 띠를 깔아 강조합니다. */}
        {/* 띠 상단은 차트 꼭대기가 아니라 이번 달 막대 높이까지만 올리고, 위쪽 여백은
            좌우 여백(막대 양옆 빈칸, barCategoryGap 10%의 절반)과 같은 픽셀만큼만 둡니다. */}
        <ReferenceArea
          x1={currentMonthLabel}
          x2={currentMonthLabel}
          y1={0}
          y2={totals[currentMonthIndex]}
          shape={(props: { x?: number; y?: number; width?: number; height?: number; className?: string }) => {
            const { x = 0, y = 0, width = 0, height = 0, className } = props
            const pad = width * 0.05
            return <rect x={x} y={y - pad} width={width} height={height + pad} className={className} />
          }}
          className="fill-primary/10"
          ifOverflow="extendDomain"
        />
        <Bar
          dataKey="정규직"
          stackId="headcount"
          fill="var(--color-primary)"
          stroke="var(--color-background)"
          strokeWidth={1}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="정규직"
            content={<SegmentCountLabel totals={totals} textClassName="fill-primary-foreground" />}
          />
        </Bar>
        <Bar
          dataKey="계약직"
          stackId="headcount"
          fill="var(--color-muted-foreground)"
          stroke="var(--color-background)"
          strokeWidth={1}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="계약직"
            content={<SegmentCountLabel totals={totals} textClassName="fill-background" />}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
