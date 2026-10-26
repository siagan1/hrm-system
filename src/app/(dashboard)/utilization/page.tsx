import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"

import { getActiveTeamOptions } from "@/actions/org.actions"
import {
  getUtilizationMatrix,
  getUtilizationReport,
  getUtilizationYearlySummary,
} from "@/actions/utilization.actions"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { DateFilter } from "@/components/utilization/date-filter"
import { ModeFilter } from "@/components/utilization/mode-filter"
import { MonthlyEventLog } from "@/components/utilization/monthly-event-log"
import { TeamFilter } from "@/components/utilization/team-filter"
import { UtilizationMatrix } from "@/components/utilization/utilization-matrix"
import { YearFilter } from "@/components/utilization/year-filter"
import { YearlyKpiCards } from "@/components/utilization/yearly-kpi-cards"
import { YearlyTrendCharts } from "@/components/utilization/yearly-trend-charts"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PaginationControls } from "@/components/ui/pagination-controls"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isManagerOrAbove } from "@/lib/auth-utils"

const PAGE_SIZE = 20

export default async function UtilizationPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string
    year?: string
    mode?: string
    teamId?: string
    page?: string
  }>
}) {
  const canView = await isManagerOrAbove()
  if (!canView) {
    redirect("/")
  }

  const { date, year, mode, teamId, page: pageParam } = await searchParams
  const targetDate = date ?? format(new Date(), "yyyy-MM-dd")
  const targetYear = year ?? String(new Date().getFullYear())
  const targetMode = mode === "planned" ? "planned" : "actual"
  const page = pageParam ? Number(pageParam) || 1 : 1

  const [report, matrix, yearlySummary, teams] = await Promise.all([
    getUtilizationReport(targetDate, targetMode, teamId),
    getUtilizationMatrix(targetYear, targetMode, teamId),
    getUtilizationYearlySummary(targetYear, targetMode, teamId),
    getActiveTeamOptions(),
  ])

  const pageRows = report.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">전사 가동률 현황</h1>
        <p className="text-sm text-muted-foreground">
          {targetYear}년 연간 추세와 인원별 투입 현황입니다.
          {targetMode === "planned" &&
            " 계획 모드 — 계약 연장 가정(계획용 가용 종료일)과 채용 예정(가상) 인력이 포함됩니다."}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <YearFilter year={targetYear} />
        <ModeFilter mode={targetMode} />
        <TeamFilter teamId={teamId} teams={teams} />
      </div>

      <YearlyKpiCards months={yearlySummary.months} averages={yearlySummary.averages} />

      <YearlyTrendCharts months={yearlySummary.months} />

      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-xl font-semibold">월별 이벤트</h2>
          <p className="text-sm text-muted-foreground">
            월별 노워크(완전 유휴) 인원, 입사, 퇴사, LP 등록 현황입니다.
          </p>
        </div>
        <MonthlyEventLog months={yearlySummary.months} />
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-xl font-semibold">인원별 연간 투입율 매트릭스</h2>
          <p className="text-sm text-muted-foreground">
            직원별 월별 투입율(투입공수 ÷ 가용공수)입니다. 가용공수는 재직 기간과 워킹데이
            관리에서 등록한 근무일수를 기준으로 근사 계산되며, 그 달에 재직하지 않은 경우
            &quot;-&quot;로 표시됩니다.
          </p>
        </div>
        <UtilizationMatrix data={matrix} />
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="detail">
          <AccordionTrigger>
            <div>
              <span>특정 날짜 기준 상세 조회</span>
              <p className="mt-0.5 text-sm font-normal text-muted-foreground">
                날짜를 지정해 그 시점의 인원수·공수·직원별 리포트를 확인합니다.
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4">
              <DateFilter date={targetDate} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardDescription>총 인원수</CardDescription>
                    <CardTitle className="text-3xl">{report.totalCount}명</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>프로젝트 투입 인원수</CardDescription>
                    <CardTitle className="text-3xl">{report.workingCount}명</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>노워크 인원수 (완전 유휴)</CardDescription>
                    <CardTitle className="text-3xl text-destructive">
                      {report.noWorkCount}명
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardDescription>전사 가용 공수</CardDescription>
                    <CardTitle className="text-3xl">{report.totalAvailableMm} MM</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>전사 투입 공수</CardDescription>
                    <CardTitle className="text-3xl">{report.totalInputMm} MM</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>No-work (유휴 공수)</CardDescription>
                    <CardTitle className="text-3xl text-destructive">
                      {report.noWorkMm} MM
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>가동률</CardDescription>
                    <CardTitle className="text-3xl">
                      {report.utilizationRate !== null
                        ? `${Math.round(report.utilizationRate * 100)}%`
                        : "-"}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>직원명</TableHead>
                      <TableHead>현재 소속 팀</TableHead>
                      <TableHead className="text-right">가용 MM</TableHead>
                      <TableHead className="text-right">투입 MM</TableHead>
                      <TableHead className="text-right">유휴(No-work) MM</TableHead>
                      <TableHead>투입 프로젝트</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          등록된 직원이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((row) => (
                        <TableRow key={row.employeeId ?? row.name}>
                          <TableCell className="font-medium">
                            {row.employeeId ? (
                              <Link
                                href={`/employees/${row.employeeId}`}
                                className="hover:underline"
                              >
                                {row.name}
                              </Link>
                            ) : (
                              <span className="flex flex-wrap items-center gap-1.5">
                                {row.name}
                                <Badge variant="secondary">가상</Badge>
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{row.teamName}</TableCell>
                          <TableCell className="text-right">{row.availableMm}</TableCell>
                          <TableCell className="text-right">{row.totalMm}</TableCell>
                          <TableCell className="text-right">
                            {row.idleMm > 0 ? (
                              <span className="text-destructive">{row.idleMm}</span>
                            ) : (
                              row.idleMm
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.isNoWork ? (
                              <Badge variant="destructive">노워크</Badge>
                            ) : (
                              <span className="flex flex-wrap items-center gap-2">
                                {row.idleMm > 0 && (
                                  <Badge variant="secondary">부분유휴 {row.idleMm}MM</Badge>
                                )}
                                {row.projectNames}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <PaginationControls
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={report.rows.length}
                basePath="/utilization"
                searchParams={{ date, year, mode, teamId }}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
