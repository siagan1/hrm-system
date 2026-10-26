# HRM System

QA 전문 조직을 위한 인사·가동률(Utilization) 관리 시스템입니다. 직원/조직 이력 관리, 등급·LP(성과개선) 관리, 프로젝트 투입 공수(MM) 산정, 전사 가동률·노워크 현황, 위젯 기반 커스텀 대시보드까지 하나의 애플리케이션에서 제공합니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript, React 19 |
| 인증 | Auth.js v5 (`next-auth@beta`), Credentials Provider, JWT 세션 |
| DB / ORM | SQLite (로컬 개발) + Prisma 7 (`@prisma/adapter-better-sqlite3` 드라이버 어댑터) — 추후 PostgreSQL로 마이그레이션 예정 |
| UI | Tailwind CSS v4, shadcn/ui (radix 기반), Tabler Icons |
| 폼 / 검증 | React 19 `useActionState`, Zod |
| 대시보드 | react-grid-layout v2 (드래그·리사이즈), Recharts |
| 기타 | bcryptjs(비밀번호 해시), date-fns |

> **주의**: 이 프로젝트는 최신 메이저 버전들(Next.js 16, Prisma 7, react-grid-layout v2, Auth.js v5)을 사용합니다. 흔히 알려진 v1 API/문서와 다른 부분이 많으니, 관련 코드를 수정할 때는 `node_modules/<package>/**/*.d.ts` 또는 번들된 README를 먼저 확인하세요. 자세한 내용은 [`CLAUDE.md`](./CLAUDE.md)를 참고하세요.

## 로컬 실행 가이드

### 0. 사전 준비물

- Node.js 22+ (npm 포함)

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 만들고 아래 두 값을 채워주세요.

```env
# SQLite 데이터베이스 파일 경로
DATABASE_URL="file:./dev.db"

# Auth.js 세션 암호화 키 (32바이트 랜덤 문자열, 아래 명령으로 생성 가능)
AUTH_SECRET="여기에_랜덤_문자열"
```

`AUTH_SECRET`은 아래 명령으로 생성할 수 있습니다.

```bash
# PowerShell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes)

# macOS / Linux
openssl rand -base64 32
```

### 3. 데이터베이스 초기화

```bash
npx prisma migrate deploy   # 마이그레이션 적용 (dev.db 생성)
npx prisma generate         # Prisma Client 생성
npm run seed                # 샘플 데이터 시딩 (계정/팀/프로젝트/워킹데이)
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속 시 로그인 화면으로 이동합니다.

### 테스트 계정 (`npm run seed` 실행 후)

| 이메일 | 비밀번호 | 권한 |
|---|---|---|
| admin@hrm.local | admin1234! | ADMIN |
| manager@hrm.local | admin1234! | MANAGER |
| user@hrm.local | admin1234! | USER |

## 주요 기능

- **인증/인가**: 이메일·비밀번호 로그인(Auth.js v5), 역할 기반 접근 제어(ADMIN/MANAGER/USER). 라우트 단위(`proxy.ts`, 각 페이지)와 Server Action 단위 이중 검증.
- **직원 관리**: 직원 등록(로그인 계정 동시 생성), 목록/상세 조회, 기본 정보 수정(ADMIN).
- **조직 이력 관리 (SCD Type 2)**: 팀 소속 변경 시 이전 이력을 보존하며 새 이력을 생성. 상세 페이지의 "조직 이력" 탭에서 변경 타임라인 확인 가능.
- **등급 관리**: 학력/자격증/경력 환산 개월수 입력 → 합계 자동 계산 → 등급 저장 (ADMIN/MANAGER).
- **LP(성과개선) 관리**: 사유·조치 계획 등록, 등록자 자동 기록 (ADMIN/MANAGER).
- **워킹데이 관리**: 월별 총 일수/근무일수/휴일 수 등록 — MM 산정의 기준 데이터 (ADMIN).
- **프로젝트 관리**: 프로젝트 등록/수정 (ADMIN/MANAGER), 전체 조회는 로그인한 모든 사용자.
- **투입 인원(MM) 관리**: 자동 산출(투입일수 ÷ 워킹데이 근무일수) 또는 수동 입력. 동일 직원·프로젝트·월 중복 방지(Upsert).
- **조직(팀) 관리**: 팀 CRUD, 현재 소속 인원이 있는 팀은 삭제 방지 (ADMIN).
- **전사 가동률 현황**: 월별 인원별 투입 MM 합계, 노워크 인원 집계 (ADMIN/MANAGER).
- **커스텀 대시보드**: 드래그 앤 드롭으로 배치를 바꿀 수 있는 위젯 대시보드(전사 인원 요약, 프로젝트별 MM 차트, 계약 만료 알림, 최근 LP 현황). 사용자별로 배치를 저장.

## 디렉토리 구조

```
prisma/
  schema.prisma       # DB 스키마
  seed.ts             # 로컬 개발용 시드 스크립트
src/
  app/
    (auth)/            # 로그인 라우트 그룹
    (dashboard)/        # 인증 필요 라우트 그룹 (레이아웃에 사이드바/헤더)
      page.tsx          # "/" — 위젯 대시보드
      employees/, projects/, teams/, working-days/, utilization/
  actions/             # Server Actions (도메인별 CRUD + 권한 검증)
  components/
    ui/                # shadcn/ui 생성 컴포넌트
    dashboard/, employees/, projects/, teams/, working-days/, utilization/, auth/
  lib/                 # prisma 싱글턴, auth-utils, 공용 유틸
  auth.ts              # Auth.js 설정
  proxy.ts             # 인증 가드 (Next.js 16, 구 middleware.ts)
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 (타입 체크 포함) |
| `npm run start` | 빌드된 앱 실행 |
| `npm run lint` | ESLint |
| `npm run seed` | 시드 데이터 생성 |

## Prisma 마이그레이션 관련 참고

이 프로젝트는 `prisma.config.ts` 기반의 Prisma 7을 사용합니다. 로컬 대화형 터미널에서는 평소처럼 `npx prisma migrate dev`를 사용하면 됩니다. (비대화형 CI/스크립트 환경에서 마이그레이션을 만들어야 하는 경우의 대안은 `CLAUDE.md`를 참고하세요.)
