"use client"

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { GradeDistributionItem } from "@/actions/dashboard.actions"

export function GradeDistributionChart({ items }: { items: GradeDistributionItem[] }) {
  const data = items.map((i) => ({ grade: i.gradeName, 인원: i.count }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 28, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          allowDecimals={false}
          domain={[0, (max: number) => Math.ceil(max * 1.15)]}
        />
        <YAxis type="category" dataKey="grade" tick={{ fontSize: 11 }} width={48} />
        <Tooltip />
        <Bar
          dataKey="인원"
          fill="var(--color-foreground)"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="인원"
            position="right"
            className="fill-foreground"
            fontSize={11}
            formatter={(value) => (value === undefined ? "" : `${value}명`)}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
