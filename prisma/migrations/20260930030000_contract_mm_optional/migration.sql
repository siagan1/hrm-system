-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectCode" TEXT,
    "name" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "location" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "totalContractMm" REAL,
    "parentProjectId" TEXT,
    CONSTRAINT "Project_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("clientName", "endDate", "id", "location", "name", "parentProjectId", "projectCode", "startDate", "totalContractMm") SELECT "clientName", "endDate", "id", "location", "name", "parentProjectId", "projectCode", "startDate", "totalContractMm" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");
CREATE INDEX "Project_parentProjectId_idx" ON "Project"("parentProjectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
