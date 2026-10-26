/**
 * 로컬 개발 환경용 시드 스크립트.
 *
 * 실행: npx tsx prisma/seed.ts
 *
 * 여러 번 실행해도 안전합니다 (upsert 기반). 기존 데이터를 지우지 않고
 * 없는 것만 채워 넣습니다.
 */
import bcrypt from "bcryptjs"

import { prisma } from "../src/lib/prisma"

const DEFAULT_PASSWORD = "admin1234!"

const ACCOUNTS = [
  { email: "admin@hrm.local", role: "ADMIN" as const },
  { email: "manager@hrm.local", role: "MANAGER" as const },
  { email: "user@hrm.local", role: "USER" as const },
]

const TEAM_NAMES = ["플랫폼서비스팀", "미디어서비스팀", "품질보증팀"]

const GRADE_CRITERIA = [
  { gradeName: "초급", requiredMonths: 0, description: "0개월 이상" },
  { gradeName: "중급", requiredMonths: 108, description: "108개월(9년) 이상" },
  { gradeName: "고급", requiredMonths: 144, description: "144개월(12년) 이상" },
  { gradeName: "특급", requiredMonths: 180, description: "180개월(15년) 이상" },
]

const GRADE_OPTIONS = [
  { category: "EDUCATION" as const, label: "고졸", months: 0, sortOrder: 0 },
  { category: "EDUCATION" as const, label: "초대졸", months: 0, sortOrder: 1 },
  { category: "EDUCATION" as const, label: "대졸", months: 0, sortOrder: 2 },
  { category: "EDUCATION" as const, label: "석사", months: 0, sortOrder: 3 },
  { category: "EDUCATION" as const, label: "박사", months: 0, sortOrder: 4 },
  { category: "CERTIFICATE" as const, label: "산업기사", months: 0, sortOrder: 0 },
  { category: "CERTIFICATE" as const, label: "기사", months: 0, sortOrder: 1 },
]

const SAMPLE_PROJECT = {
  projectCode: "PRJ-2026-001",
  name: "커머스 플랫폼 QA 용역",
  clientName: "SKB",
  location: "서울 강남",
  startDate: new Date(`${new Date().getFullYear()}-01-01`),
  totalContractMm: 12,
}

async function seedAccounts() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  for (const account of ACCOUNTS) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: { email: account.email, passwordHash, role: account.role },
    })
  }

  console.log(`계정 (공통 비밀번호: ${DEFAULT_PASSWORD})`)
  for (const account of ACCOUNTS) {
    console.log(`  - [${account.role}] ${account.email}`)
  }
}

async function seedTeams() {
  for (const teamName of TEAM_NAMES) {
    const existing = await prisma.team.findFirst({
      where: { teamName, endDate: null },
    })
    if (!existing) {
      await prisma.team.create({ data: { teamName } })
    }
  }
  console.log(`팀: ${TEAM_NAMES.join(", ")}`)
}

async function seedGradeCriteria() {
  for (const criterion of GRADE_CRITERIA) {
    await prisma.gradeCriterion.upsert({
      where: { gradeName: criterion.gradeName },
      update: criterion,
      create: criterion,
    })
  }
  console.log(`등급 기준: ${GRADE_CRITERIA.map((g) => g.gradeName).join(", ")}`)
}

async function seedGradeOptions() {
  for (const option of GRADE_OPTIONS) {
    await prisma.gradeOption.upsert({
      where: { category_label: { category: option.category, label: option.label } },
      update: {},
      create: option,
    })
  }
  console.log(`등급 옵션(학력/자격증): ${GRADE_OPTIONS.map((o) => o.label).join(", ")}`)
}

async function seedSampleProject() {
  await prisma.project.upsert({
    where: { projectCode: SAMPLE_PROJECT.projectCode },
    update: {},
    create: SAMPLE_PROJECT,
  })
  console.log(`샘플 프로젝트: ${SAMPLE_PROJECT.projectCode} (${SAMPLE_PROJECT.name})`)
}

async function main() {
  console.log("시드 데이터 생성을 시작합니다.\n")

  await seedAccounts()
  await seedTeams()
  await seedGradeCriteria()
  await seedGradeOptions()
  await seedSampleProject()

  console.log("\n완료되었습니다. `npm run dev`로 서버를 실행하고 위 계정으로 로그인해 보세요.")
  console.log("워킹데이(공휴일 등 제외 날짜)는 /working-days 화면에서 직접 등록하세요.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
