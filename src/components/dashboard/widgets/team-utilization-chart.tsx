"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { TeamUtilizationPoint } from "@/actions/dashboard.actions"

export function TeamUtilizationChart({ teams }: { teams: TeamUtilizationPoint[] }) {
  const data = teams.map((t) => ({
    team: t.teamName,
    가동률: t.utilizationRate !== null ? Math.round(t.utilizationRate * 1000) / 10 : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
        <YAxis type="category" dataKey="team" tick={{ fontSize: 11 }} width={96} />
        <Tooltip formatter={(value) => `${value}%`} />
        <Bar dataKey="가동률" fill="var(--color-foreground)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
