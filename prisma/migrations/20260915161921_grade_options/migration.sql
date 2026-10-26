-- CreateTable
CREATE TABLE "GradeOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "months" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmployeeGrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "eduOptionId" TEXT,
    "certOptionId" TEXT,
    "eduMonths" INTEGER NOT NULL DEFAULT 0,
    "certMonths" INTEGER NOT NULL DEFAULT 0,
    "expMonths" INTEGER NOT NULL DEFAULT 0,
    "totalMonths" INTEGER NOT NULL DEFAULT 0,
    "currentGrade" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeGrade_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmployeeGrade_eduOptionId_fkey" FOREIGN KEY ("eduOptionId") REFERENCES "GradeOption" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmployeeGrade_certOptionId_fkey" FOREIGN KEY ("certOptionId") REFERENCES "GradeOption" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmployeeGrade" ("certMonths", "currentGrade", "eduMonths", "employeeId", "expMonths", "id", "totalMonths", "updatedAt") SELECT "certMonths", "currentGrade", "eduMonths", "employeeId", "expMonths", "id", "totalMonths", "updatedAt" FROM "EmployeeGrade";
DROP TABLE "EmployeeGrade";
ALTER TABLE "new_EmployeeGrade" RENAME TO "EmployeeGrade";
CREATE UNIQUE INDEX "EmployeeGrade_employeeId_key" ON "EmployeeGrade"("employeeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GradeOption_category_label_key" ON "GradeOption"("category", "label");
