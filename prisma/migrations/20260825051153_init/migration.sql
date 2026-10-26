-- CreateTable
CREATE TABLE "WorkingDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetMonth" TEXT NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "workingDays" INTEGER NOT NULL,
    "holidays" INTEGER NOT NULL,
    "memo" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GradeCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeName" TEXT NOT NULL,
    "requiredMonths" INTEGER NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "empType" TEXT NOT NULL,
    "joinDate" DATETIME NOT NULL,
    "resignDate" DATETIME,
    "contractEndDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamName" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "EmployeeTeamHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    CONSTRAINT "EmployeeTeamHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmployeeTeamHistory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeGrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "eduMonths" INTEGER NOT NULL DEFAULT 0,
    "certMonths" INTEGER NOT NULL DEFAULT 0,
    "expMonths" INTEGER NOT NULL DEFAULT 0,
    "totalMonths" INTEGER NOT NULL DEFAULT 0,
    "currentGrade" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeGrade_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LpRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actionPlan" TEXT NOT NULL,
    "registeredBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LpRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "location" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "totalContractMm" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "targetMonth" TEXT NOT NULL,
    "inputMm" REAL NOT NULL,
    "isManualMm" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectAllocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DashboardSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "layoutData" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DashboardSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkingDay_targetMonth_key" ON "WorkingDay"("targetMonth");

-- CreateIndex
CREATE UNIQUE INDEX "GradeCriterion_gradeName_key" ON "GradeCriterion"("gradeName");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamName_key" ON "Team"("teamName");

-- CreateIndex
CREATE INDEX "EmployeeTeamHistory_employeeId_idx" ON "EmployeeTeamHistory"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeTeamHistory_teamId_idx" ON "EmployeeTeamHistory"("teamId");

-- CreateIndex
CREATE INDEX "EmployeeGrade_employeeId_idx" ON "EmployeeGrade"("employeeId");

-- CreateIndex
CREATE INDEX "LpRecord_employeeId_idx" ON "LpRecord"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE INDEX "ProjectAllocation_projectId_idx" ON "ProjectAllocation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAllocation_employeeId_projectId_targetMonth_key" ON "ProjectAllocation"("employeeId", "projectId", "targetMonth");

-- CreateIndex
CREATE INDEX "DashboardSetting_userId_idx" ON "DashboardSetting"("userId");
