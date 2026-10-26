/**
 * Claude Code Stop 훅: 운영(서버 PC 배포·백업)에 영향을 주는 파일이 바뀌었는데
 * docs/운영-가이드.md가 같이 바뀌지 않았으면, Claude가 응답을 마치기 전에 가이드를
 * 검토·갱신하도록 붙잡습니다(decision: "block").
 *
 * 같은 변경 묶음에 대해서는 한 번만 알립니다 — 검토 결과 가이드 수정이 필요 없다고
 * 판단한 경우 계속 붙잡지 않도록, 알린 상태를 .git/ops-guide-ack 에 기록합니다.
 * 설정 위치: .claude/settings.local.json (hooks.Stop)
 */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const GUIDE = "docs/운영-가이드.md"
const ACK_FILE = path.join(projectRoot, ".git", "ops-guide-ack")

/** 이 경로가 바뀌면 운영 가이드(설치·업데이트·백업 절차)를 다시 봐야 합니다. */
const OPS_RELEVANT = [
  /^scripts\//,
  /^prisma\/migrations\//,
  /^prisma\/seed\.ts$/,
  /^prisma\.config\.ts$/,
  /^package\.json$/,
  /^next\.config\.ts$/,
  /^src\/auth\.ts$/,
  /^src\/lib\/prisma\.ts$/,
  /^\.gitignore$/,
]

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "") || "{}")
  } catch {
    return {}
  }
}

function git(args) {
  for (const exe of ["git", "C:\\Program Files\\Git\\cmd\\git.exe"]) {
    try {
      return execFileSync(exe, ["-c", "core.quotepath=false", ...args], {
        cwd: projectRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
    } catch {
      // 다음 후보로
    }
  }
  return null
}

const input = readStdin()
if (input.stop_hook_active) process.exit(0) // 이미 한 번 붙잡은 뒤의 재시도는 통과

const status = git(["status", "--porcelain", "--untracked-files=all"])
if (status === null) process.exit(0) // git이 없으면 조용히 통과

const changed = status
  .split("\n")
  .filter(Boolean)
  .map((line) => line.slice(3).replace(/^"|"$/g, "").split(" -> ").pop())

if (changed.includes(GUIDE)) process.exit(0)

const relevant = changed.filter((f) => OPS_RELEVANT.some((re) => re.test(f))).sort()
if (relevant.length === 0) process.exit(0)

const signature = createHash("sha1")
  .update(
    relevant
      .map((f) => {
        const full = path.join(projectRoot, f)
        return `${f}:${existsSync(full) ? statSync(full).mtimeMs : "deleted"}`
      })
      .join("\n")
  )
  .digest("hex")

if (existsSync(ACK_FILE) && readFileSync(ACK_FILE, "utf8").trim() === signature) process.exit(0)
writeFileSync(ACK_FILE, signature)

console.log(
  JSON.stringify({
    decision: "block",
    reason:
      `운영에 영향을 줄 수 있는 파일이 바뀌었지만 ${GUIDE}는 그대로입니다:\n` +
      relevant.map((f) => `- ${f}`).join("\n") +
      `\n\n${GUIDE}(설치·업데이트·백업·금지 명령)와 CLAUDE.md 10-1절에 반영할 내용이 있는지 검토하고, ` +
      "필요하면 갱신하세요. 영향이 없다면 그 판단을 사용자에게 한 줄로 알리고 마치면 됩니다.",
  })
)
