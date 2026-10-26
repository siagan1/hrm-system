-- DropIndex
DROP INDEX "EmployeeGrade_employeeId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeGrade_employeeId_key" ON "EmployeeGrade"("employeeId");
