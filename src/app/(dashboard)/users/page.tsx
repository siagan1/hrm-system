import { redirect } from "next/navigation"
import { format } from "date-fns"

import { getUnlinkedEmployeeOptions, getUsers } from "@/actions/user.actions"
import { CreateUserDialog } from "@/components/users/create-user-dialog"
import { DeleteUserButton } from "@/components/users/delete-user-button"
import { RoleSelect } from "@/components/users/role-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCurrentUser, isAdmin } from "@/lib/auth-utils"

export default async function UsersPage() {
  const admin = await isAdmin()
  if (!admin) {
    redirect("/")
  }

  const [users, currentUser, unlinkedEmployees] = await Promise.all([
    getUsers(),
    getCurrentUser(),
    getUnlinkedEmployeeOptions(),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">사용자 관리</h1>
          <p className="text-sm text-muted-foreground">
            전체 계정 {users.length}개 · 로그인 계정이 없는 직원{" "}
            {unlinkedEmployees.length}명
          </p>
        </div>
        <CreateUserDialog unlinkedEmployees={unlinkedEmployees} />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이메일</TableHead>
              <TableHead>연결된 직원</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead>권한</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  등록된 계정이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isSelf = user.id === currentUser?.id
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (나)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{user.employee?.name ?? "-"}</TableCell>
                    <TableCell>{format(user.createdAt, "yyyy-MM-dd")}</TableCell>
                    <TableCell>
                      <RoleSelect
                        userId={user.id}
                        role={user.role}
                        disabled={isSelf}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteUserButton userId={user.id} disabled={isSelf} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
