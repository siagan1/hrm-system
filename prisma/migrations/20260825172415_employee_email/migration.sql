-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
