-- DropIndex
DROP INDEX "DashboardSetting_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "DashboardSetting_userId_key" ON "DashboardSetting"("userId");
