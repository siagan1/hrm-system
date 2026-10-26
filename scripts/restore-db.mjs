/**
 * 백업 파일로 DB를 복구합니다.
 *
 * 실행: npm run restore -- <백업파일 경로>
 *
 * 반드시 서버(next start / 서비스)를 먼저 멈춘 뒤 실행하세요. 켜져 있는 상태에서 DB 파일을
 * 바꾸면 서버가 쥐고 있는 연결과 어긋나 데이터가 깨질 수 있습니다.
 * 복구 직전에 현재 DB를 "복구전" 라벨로 한 번 더 백업해 두므로, 잘못 복구해도 되돌릴 수 있습니다.
 */
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs"
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

function stamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

async function main() {
  const source = process.argv[2]
  if (!source) throw new Error("복구할 백업 파일 경로를 지정하세요. 예: npm run restore -- C:/hrm-data/backups/hrm-20261026-020000.db")
  const sourcePath = path.resolve(source)
  if (!existsSync(sourcePath)) throw new Error(`백업 파일이 없습니다: ${sourcePath}`)

  const check = new Database(sourcePath, { readonly: true, fileMustExist: true })
  const result = check.pragma("integrity_check", { simple: true })
  check.close()
  if (result !== "ok") throw new Error(`백업 파일이 손상되었습니다(${result}). 다른 백업을 선택하세요.`)

  const url = process.env.DATABASE_URL ?? "file:./dev.db"
  const dbPath = path.resolve(projectRoot, url.replace(/^file:/, ""))

  if (existsSync(dbPath)) {
    const backupDir = path.resolve(projectRoot, process.env.BACKUP_DIR ?? path.join(path.dirname(dbPath), "backups"))
    mkdirSync(backupDir, { recursive: true })
    const safety = path.join(backupDir, `hrm-${stamp()}-복구전.db`)
    const db = new Database(dbPath, { readonly: true, fileMustExist: true })
    try {
      await db.backup(safety)
    } finally {
      db.close()
    }
    console.log(`현재 DB를 먼저 보관했습니다: ${safety}`)
  }

  for (const suffix of ["-journal", "-wal", "-shm"]) {
    if (existsSync(dbPath + suffix)) unlinkSync(dbPath + suffix)
  }
  copyFileSync(sourcePath, dbPath)
  console.log(`복구 완료: ${sourcePath} → ${dbPath}`)
  console.log("이제 서버를 다시 시작하세요.")
}

main().catch((error) => {
  console.error(`[복구 실패] ${error.message}`)
  process.exitCode = 1
})
