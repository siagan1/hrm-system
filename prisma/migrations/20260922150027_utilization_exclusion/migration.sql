-- CreateTable
CREATE TABLE "EmployeeUtilizationOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeUtilizationOverride_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "empType" TEXT NOT NULL,
    "joinDate" DATETIME NOT NULL,
    "resignDate" DATETIME,
    "contractEndDate" DATETIME,
    "regularConversionDate" DATETIME,
    "excludedFromUtilization" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("contractEndDate", "createdAt", "email", "empType", "id", "joinDate", "name", "regularConversionDate", "resignDate", "updatedAt", "userId") SELECT "contractEndDate", "createdAt", "email", "empType", "id", "joinDate", "name", "regularConversionDate", "resignDate", "updatedAt", "userId" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EmployeeUtilizationOverride_employeeId_idx" ON "EmployeeUtilizationOverride"("employeeId");
