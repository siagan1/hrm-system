import { format } from "date-fns"
import Link from "next/link"

import { getEmployees } from "@/actions/employee.actions"
import { getActiveTeamOptions } from "@/actions/org.actions"
import { CreateEmployeeDialog } from "@/components/employees/create-employee-dialog"
import { EmployeeFilterBar } from "@/components/employees/employee-filter-bar"
import { TeamCell } from "@/components/employees/team-cell"
import { PaginationControls } from "@/components/ui/pagination-controls"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isAdmin } from "@/lib/auth-utils"
import { getEmploymentStatusLabel } from "@/lib/employee-constants"

const PAGE_SIZE = 20

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string
    teamId?: string
    empType?: string
    page?: string
  }>
}) {
  const filters = await searchParams
  const page = filters.page ? Number(filters.page) || 1 : 1

  const [{ rows: employees, totalCount }, teams, canCreate] = await Promise.all([
    getEmployees({ ...filters, page, pageSize: PAGE_SIZE }),
    getActiveTeamOptions(),
    isAdmin(),
  ])

  const isFiltered = !!(filters.name || filters.teamId || filters.empType)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">직원 관리</h1>
          <p className="text-sm text-muted-foreground">
            {isFiltered
              ? `검색 결과 ${totalCount}명`
              : `전체 직원 ${totalCount}명`}
          </p>
        </div>
        {canCreate && <CreateEmployeeDialog teams={teams} />}
      </div>

      <EmployeeFilterBar teams={teams} />

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>등급</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>입사일</TableHead>
              <TableHead>계약 종료일</TableHead>
              <TableHead>퇴사일</TableHead>
              <TableHead>현재 소속 팀</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {isFiltered
                    ? "검색 조건에 맞는 직원이 없습니다."
                    : "등록된 직원이 없습니다."}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => {
                const currentTeam = employee.teamHistories[0]?.team
                const status = getEmploymentStatusLabel(employee)

                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/employees/${employee.id}`}
                        className="hover:underline"
                      >
                        {employee.name}
                      </Link>
                    </TableCell>
                    <TableCell>{employee.grade?.currentGrade ?? "-"}</TableCell>
                    <TableCell>{status}</TableCell>
                    <TableCell>
                      {format(employee.joinDate, "yyyy-MM-dd")}
                    </TableCell>
                    <TableCell>
                      {employee.contractEndDate
                        ? format(employee.contractEndDate, "yyyy-MM-dd")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {employee.resignDate
                        ? format(employee.resignDate, "yyyy-MM-dd")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {canCreate ? (
                        <TeamCell
                          employeeId={employee.id}
                          employeeName={employee.name}
                          currentTeamId={currentTeam?.id}
                          teams={teams}
                        />
                      ) : (
                        (currentTeam?.teamName ?? "미배정")
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/employees"
        searchParams={filters}
      />
    </div>
  )
}
