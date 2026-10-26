<#
  서버 PC 전용 업데이트 스크립트. 개발 PC에서 push한 최신 코드를 받아 적용합니다.
  데이터(DB 파일)는 프로젝트 폴더 밖(DATABASE_URL)에 있으므로 코드 갱신과 무관하게 유지되고,
  스키마 변경은 prisma migrate deploy(아직 적용 안 된 마이그레이션만 순서대로 적용)로만 반영합니다.

  실행(서버 PC, 프로젝트 폴더에서, 관리자 PowerShell):
    powershell -ExecutionPolicy Bypass -File scripts\update-server.ps1

  절대 서버에서 실행하면 안 되는 명령: prisma migrate dev / migrate reset / db push / npm run seed
#>
param(
  [string]$ServiceName = "HRM"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Step($msg) { Write-Host "`n=== $msg" -ForegroundColor Cyan }
function Run($exe, [string[]]$argList) {
  & $exe @argList
  if ($LASTEXITCODE -ne 0) { throw "$exe $($argList -join ' ') 실패 (exit $LASTEXITCODE)" }
}

$previousCommit = (git rev-parse --short HEAD).Trim()

Step "1/7 최신 코드 받기 (현재 커밋: $previousCommit)"
Run git @("pull", "--ff-only")
$newCommit = (git rev-parse --short HEAD).Trim()
if ($newCommit -eq $previousCommit) {
  Write-Host "새 변경 사항이 없습니다. 종료합니다."
  exit 0
}
git log --oneline "$previousCommit..$newCommit"

Step "2/7 적용될 DB 마이그레이션 확인"
npx prisma migrate status
Write-Host "위에 'not yet been applied'로 나온 마이그레이션이 이번에 적용됩니다."
$answer = Read-Host "계속할까요? (y/N)"
if ($answer -ne "y") {
  git reset --hard $previousCommit | Out-Null
  Write-Host "취소했습니다. 코드를 $previousCommit 로 되돌렸습니다."
  exit 1
}

Step "3/7 서비스 중지 ($ServiceName)"
Stop-Service -Name $ServiceName

try {
  Step "4/7 DB 백업"
  Run npm @("run", "backup", "--", "업데이트전-$newCommit")

  Step "5/7 패키지 설치"
  Run npm @("ci")

  Step "6/7 DB 마이그레이션 적용 + Prisma Client 생성"
  Run npx @("prisma", "migrate", "deploy")
  Run npx @("prisma", "generate")

  Step "7/7 빌드"
  Run npm @("run", "build")
}
catch {
  Write-Host "`n[업데이트 실패] $_" -ForegroundColor Red
  Write-Host "되돌리는 방법 (docs\운영-가이드.md '문제가 생겼을 때' 참고):"
  Write-Host "  1) git reset --hard $previousCommit"
  Write-Host "  2) 마이그레이션이 일부 적용됐다면: npm run restore -- <backups 폴더의 '업데이트전-$newCommit' 백업>"
  Write-Host "  3) npm ci; npx prisma generate; npm run build; Start-Service $ServiceName"
  exit 1
}

Start-Service -Name $ServiceName
Write-Host "`n업데이트 완료: $previousCommit -> $newCommit" -ForegroundColor Green
