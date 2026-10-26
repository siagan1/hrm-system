-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "WorkingDay";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "NonWorkingDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "NonWorkingDay_date_key" ON "NonWorkingDay"("date");

-- CreateIndex
CREATE INDEX "NonWorkingDay_date_idx" ON "NonWorkingDay"("date");
