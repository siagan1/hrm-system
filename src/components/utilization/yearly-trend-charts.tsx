"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { UtilizationYearlyMonthSummary } from "@/actions/utilization.actions"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
]

export function YearlyTrendCharts({ months }: { months: UtilizationYearlyMonthSummary[] }) {
  const mmData = months.map((m, i) => ({
    month: MONTH_LABELS[i],
    가용: m.availableMm,
    투입: m.inputMm,
  }))
  const rateData = months.map((m, i) => ({
    month: MONTH_LABELS[i],
    가동률: m.utilizationRate !== null ? Math.round(m.utilizationRate * 1000) / 10 : null,
  }))
  const headcountData = months.map((m, i) => ({
    month: MONTH_LABELS[i],
    정규직: m.regularCount,
    계약직: m.contractCount,
  }))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>월별 공수 추이 (가용 vs 투입)</CardTitle>
        </CardHeader>
        <div className="h-64 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mmData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="가용" fill="var(--color-muted-foreground)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="투입" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>월별 가동률 추이</CardTitle>
        </CardHeader>
        <div className="h-64 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rateData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} unit="%" />
              <Tooltip formatter={(value) => `${value}%`} />
              <ReferenceLine y={100} strokeDasharray="4 4" className="stroke-muted-foreground" />
              <Line
                type="monotone"
                dataKey="가동률"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>월별 인원 구성 (정규직/계약직)</CardTitle>
        </CardHeader>
        <div className="h-64 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={headcountData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="정규직" stackId="headcount" fill="var(--color-primary)" radius={[0, 0, 0, 0]} />
              <Bar
                dataKey="계약직"
                stackId="headcount"
                fill="var(--color-muted-foreground)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
