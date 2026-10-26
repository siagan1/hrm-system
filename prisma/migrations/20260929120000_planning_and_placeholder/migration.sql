-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "plannedActiveUntil" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT,
    "placeholderLabel" TEXT,
    "placeholderGrade" TEXT,
    "projectId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "monthlyMm" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProjectAssignment" ("createdAt", "employeeId", "endDate", "id", "monthlyMm", "projectId", "startDate") SELECT "createdAt", "employeeId", "endDate", "id", "monthlyMm", "projectId", "startDate" FROM "ProjectAssignment";
DROP TABLE "ProjectAssignment";
ALTER TABLE "new_ProjectAssignment" RENAME TO "ProjectAssignment";
CREATE INDEX "ProjectAssignment_employeeId_idx" ON "ProjectAssignment"("employeeId");
CREATE INDEX "ProjectAssignment_projectId_idx" ON "ProjectAssignment"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
