/**
 * SQLite DB 백업 스크립트.
 *
 * 실행: npm run backup            (정기 백업)
 *       npm run backup -- 배포전   (파일명에 라벨을 붙여 남김. 라벨이 붙은 백업은 자동 삭제되지 않음)
 *       npm run backup -- --if-changed  (마지막 백업 이후 DB가 바뀌었을 때만 백업 — 세션 종료 훅용)
 *
 * - better-sqlite3의 온라인 백업 API를 써서, 서버(next start)가 켜져 있는 상태에서도
 *   일관된 스냅샷을 만듭니다. DB 파일을 그냥 복사하면 쓰는 도중의 파일이 복사될 수 있어
 *   쓰지 마세요.
 * - 백업 직후 PRAGMA integrity_check로 백업 파일이 정상인지 확인합니다.
 * - 보관 정책(라벨 없는 정기 백업만 대상): 최근 30일치는 전부, 그 이전은 매월 첫 백업만
 *   12개월치 보관하고 나머지는 삭제합니다.
 *
 * 환경변수(.env):
 *   DATABASE_URL     백업할 DB (예: file:C:/hrm-data/hrm.db)
 *   BACKUP_DIR       백업 저장 폴더 (기본값: DB 파일과 같은 폴더의 backups/)
 *   BACKUP_COPY_DIR  (선택) 2차 사본 폴더 — OneDrive/NAS/외장디스크 등 다른 저장소 권장
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(path.join(projectRoot, "package.json"))
const Database = require("better-sqlite3")

try {
  process.loadEnvFile(path.join(projectRoot, ".env"))
} catch {
  // .env가 없으면 이미 설정된 환경변수만 사용합니다.
}

const KEEP_DAILY_DAYS = 30
const KEEP_MONTHLY_MONTHS = 12
const FILE_PATTERN = /^hrm-(\d{8})-(\d{6})(?:-(.+))?\.db$/

function resolveDbPath() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db"
  return path.resolve(projectRoot, url.replace(/^file:/, ""))
}

function timestamp(date) {
  const pad = (n) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

function applyRetention(dir, now) {
  const dailyCutoff = new Date(now)
  dailyCutoff.setDate(dailyCutoff.getDate() - KEEP_DAILY_DAYS)
  const monthlyCutoff = new Date(now)
  monthlyCutoff.setMonth(monthlyCutoff.getMonth() - KEEP_MONTHLY_MONTHS)

  const regular = readdirSync(dir)
    .map((name) => ({ name, match: FILE_PATTERN.exec(name) }))
    .filter(({ match }) => match && !match[3]) // 라벨 붙은 백업은 보관 정책 대상에서 제외
    .map(({ name, match }) => {
      const d = match[1]
      return { name, date: new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T00:00:00`) }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const keptMonths = new Set()
  const removed = []
  for (const file of regular) {
    if (file.date >= dailyCutoff) continue
    const monthKey = file.name.slice(4, 10) // YYYYMM
    if (file.date >= monthlyCutoff && !keptMonths.has(monthKey)) {
      keptMonths.add(monthKey)
      continue
    }
    unlinkSync(path.join(dir, file.name))
    removed.push(file.name)
  }
  return removed
}

/** DB(및 WAL 파일)의 마지막 수정 시각이 가장 최근 백업보다 이후인지 확인합니다. */
function changedSinceLastBackup(dbPath, backupDir) {
  const lastBackupMs = Math.max(
    0,
    ...readdirSync(backupDir)
      .filter((name) => FILE_PATTERN.test(name))
      .map((name) => statSync(path.join(backupDir, name)).mtimeMs)
  )
  const dbModifiedMs = Math.max(
    ...[dbPath, `${dbPath}-wal`].filter((p) => existsSync(p)).map((p) => statSync(p).mtimeMs)
  )
  return dbModifiedMs > lastBackupMs
}

async function main() {
  const args = process.argv.slice(2)
  const ifChanged = args.includes("--if-changed")
  const label = args.find((a) => !a.startsWith("--"))?.replace(/[^\p{L}\p{N}_-]/gu, "")
  const dbPath = resolveDbPath()
  if (!existsSync(dbPath)) throw new Error(`DB 파일이 없습니다: ${dbPath}`)

  const backupDir = path.resolve(projectRoot, process.env.BACKUP_DIR ?? path.join(path.dirname(dbPath), "backups"))
  mkdirSync(backupDir, { recursive: true })

  if (ifChanged && !changedSinceLastBackup(dbPath, backupDir)) {
    console.log("마지막 백업 이후 DB 변경이 없어 백업을 건너뜁니다.")
    return
  }

  const now = new Date()
  const fileName = `hrm-${timestamp(now)}${label ? `-${label}` : ""}.db`
  const target = path.join(backupDir, fileName)

  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    await db.backup(target)
  } finally {
    db.close()
  }

  const check = new Database(target, { readonly: true })
  const result = check.pragma("integrity_check", { simple: true })
  check.close()
  if (result !== "ok") {
    unlinkSync(target)
    throw new Error(`백업 파일 무결성 검사 실패(${result}) — 백업을 삭제했습니다. DB 상태를 확인하세요.`)
  }
  console.log(`백업 완료: ${target}`)

  const copyDir = process.env.BACKUP_COPY_DIR
  if (copyDir) {
    const resolvedCopyDir = path.resolve(projectRoot, copyDir)
    mkdirSync(resolvedCopyDir, { recursive: true })
    copyFileSync(target, path.join(resolvedCopyDir, fileName))
    console.log(`2차 사본: ${path.join(resolvedCopyDir, fileName)}`)
    applyRetention(resolvedCopyDir, now)
  }

  const removed = applyRetention(backupDir, now)
  if (removed.length > 0) console.log(`보관 기간이 지난 백업 ${removed.length}개 삭제`)
}

main().catch((error) => {
  console.error(`[백업 실패] ${error.message}`)
  process.exitCode = 1
})
