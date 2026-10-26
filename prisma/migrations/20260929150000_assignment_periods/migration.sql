-- CreateTable
CREATE TABLE "ProjectAssignmentPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    CONSTRAINT "ProjectAssignmentPeriod_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ProjectAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- DataMigration: 기존 ProjectAssignment의 startDate/endDate를 구간(period) 1건씩으로 이관.
-- 1:1 이관이라 기존 cuid를 period id로 그대로 재사용해도 유니크가 보장됨.
INSERT INTO "ProjectAssignmentPeriod" ("id", "assignmentId", "startDate", "endDate")
SELECT "id", "id", "startDate", "endDate" FROM "ProjectAssignment";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT,
    "placeholderLabel" TEXT,
    "placeholderGrade" TEXT,
    "projectId" TEXT NOT NULL,
    "monthlyMm" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProjectAssignment" ("createdAt", "employeeId", "id", "monthlyMm", "placeholderGrade", "placeholderLabel", "projectId") SELECT "createdAt", "employeeId", "id", "monthlyMm", "placeholderGrade", "placeholderLabel", "projectId" FROM "ProjectAssignment";
DROP TABLE "ProjectAssignment";
ALTER TABLE "new_ProjectAssignment" RENAME TO "ProjectAssignment";
CREATE INDEX "ProjectAssignment_employeeId_idx" ON "ProjectAssignment"("employeeId");
CREATE INDEX "ProjectAssignment_projectId_idx" ON "ProjectAssignment"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProjectAssignmentPeriod_assignmentId_idx" ON "ProjectAssignmentPeriod"("assignmentId");
