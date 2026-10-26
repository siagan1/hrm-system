-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupName" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "previousGroupId" TEXT,
    CONSTRAINT "Group_previousGroupId_fkey" FOREIGN KEY ("previousGroupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamName" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "groupId" TEXT,
    "previousTeamId" TEXT,
    CONSTRAINT "Team_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Team_previousTeamId_fkey" FOREIGN KEY ("previousTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Team" ("description", "id", "teamName") SELECT "description", "id", "teamName" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE UNIQUE INDEX "Team_previousTeamId_key" ON "Team"("previousTeamId");
CREATE INDEX "Team_groupId_idx" ON "Team"("groupId");
CREATE INDEX "Team_startDate_idx" ON "Team"("startDate");
CREATE INDEX "Team_endDate_idx" ON "Team"("endDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Group_previousGroupId_key" ON "Group"("previousGroupId");

-- CreateIndex
CREATE INDEX "Group_startDate_idx" ON "Group"("startDate");

-- CreateIndex
CREATE INDEX "Group_endDate_idx" ON "Group"("endDate");
