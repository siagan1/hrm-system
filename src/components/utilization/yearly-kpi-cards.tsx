"use client"

import { Line, LineChart, ResponsiveContainer } from "recharts"

import type { UtilizationYearlyMonthSummary } from "@/actions/utilization.actions"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const data = values.map((value, i) => ({ i, value }))
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function YearlyKpiCards({
  months,
  averages,
}: {
  months: UtilizationYearlyMonthSummary[]
  averages: {
    headcount: number
    availableMm: number
    inputMm: number
    utilizationRate: number | null
  }
}) {
  const totalAvailableMm = Math.round(months.reduce((s, m) => s + m.availableMm, 0) * 100) / 100
  const totalInputMm = Math.round(months.reduce((s, m) => s + m.inputMm, 0) * 100) / 100

  const cards = [
    {
      label: "평균 총원",
      value: `${averages.headcount}명`,
      values: months.map((m) => m.headcount),
    },
    {
      label: "평균 가동률",
      value: averages.utilizationRate !== null ? `${Math.round(averages.utilizationRate * 100)}%` : "-",
      values: months.map((m) => (m.utilizationRate ?? 0) * 100),
    },
    {
      label: "연간 총 가용 공수",
      value: `${totalAvailableMm} MM`,
      values: months.map((m) => m.availableMm),
    },
    {
      label: "연간 총 투입 공수",
      value: `${totalInputMm} MM`,
      values: months.map((m) => m.inputMm),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl">{card.value}</CardTitle>
          </CardHeader>
          <Sparkline values={card.values} color="var(--color-foreground)" />
        </Card>
      ))}
    </div>
  )
}
