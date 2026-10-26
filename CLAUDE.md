@AGENTS.md

# HRM System — 프로젝트 아키텍처 노트

이 문서는 다음에 이 프로젝트를 이어서 작업할 때(AI든 사람이든) 컨텍스트를 잃지 않도록 남기는 기록입니다.
"무엇을" 했는지는 코드/git history가 말해주므로, 여기서는 **왜 이렇게 했는지**와 **다시 겪을 만한 함정**을 중심으로 적습니다.

## 1. 이 저장소는 "당신이 아는 그 버전"이 아닙니다

세팅 당시(2026-08) 최신 메이저 버전들을 그대로 설치했더니, 학습 데이터에 있는 지식과 실제 동작이 다른 경우가 여러 번 있었습니다.
**새 기능을 추가하기 전에 관련 패키지의 `node_modules/<pkg>/**/*.d.ts` 또는 번들된 README를 먼저 읽으세요.** 특히:

- **Next.js 16**: `middleware.ts`가 **`proxy.ts`로 이름이 바뀌었습니다** (`export function proxy` 또는 `export default`, Node.js 런타임이 기본). `node_modules/next/dist/docs/`에 실제 문서가 번들되어 있으니 확신이 안 서면 거기서 확인하세요. 또한 공식 문서가 명시적으로 경고하는 부분: **Server Action은 Proxy의 matcher에서 조용히 빠질 수 있으므로, Proxy만 믿지 말고 각 페이지·Server Action에서 인증/인가를 다시 검증**해야 합니다 (아래 3번 참고).
- **Prisma 7**: `prisma.config.ts` 기반 설정으로 바뀌었고, 새 `prisma-client` 제너레이터는 **driver adapter가 필수**입니다. SQLite는 `@prisma/adapter-better-sqlite3`를 사용합니다 (`src/lib/prisma.ts` 참고). `PrismaClient`를 직접 `new`하지 말고 항상 이 싱글턴을 import하세요.
- **react-grid-layout v2**: 완전 재작성되어 `WidthProvider` HOC, 최상위 `cols`/`rowHeight` prop 같은 v1 API가 사라졌습니다. `useContainerWidth` 훅 + `gridConfig`/`dragConfig`/`resizeConfig` 객체를 씁니다. 번들된 `node_modules/react-grid-layout/README.md`가 매우 상세하니 참고하세요.
- **next-auth (Auth.js) v5 beta**: `next-auth@beta`를 씁니다 (안정 버전은 React 19/Next 16 미지원). `NextAuth(config)` → `{ handlers, auth, signIn, signOut }` 패턴은 동일합니다.
- **shadcn CLI**: 기본 스타일이 `base-nova`/`radix-nova` 같은 새 프리셋 라인으로 바뀌었는데, 이 라인은 `form` 컴포넌트가 아직 빈 스텁입니다. 이 프로젝트는 `-b radix -p base` 프리셋(구 `new-york`류, `components.json`의 `style: "radix-nova"`이지만 실제로는 `@radix-ui/*` 기반)으로 재초기화했습니다. `form.tsx`는 CLI가 못 채워줘서 `new-york` 스타일 레지스트리에서 직접 받아와 alias만 고쳐 넣었습니다.

## 2. 데이터 모델 — SCD Type 2 이력 관리

`EmployeeTeamHistory`가 팀 소속 이력을 SCD Type 2 방식으로 관리합니다.

- **현재 소속** = `endDate IS NULL`인 레코드. 항상 이 조건으로 "현재" 값을 찾습니다 (`where: { endDate: null }`).
- **소속 변경**(`changeEmployeeTeam` in `employee.actions.ts`)은 반드시 트랜잭션으로: (1) 기존 활성 레코드의 `endDate`를 오늘로 마감 → (2) 새 팀으로 `startDate`=오늘, `endDate`=null인 레코드 INSERT. 동일 팀으로 재선택하면 중복 이력이 쌓이지 않도록 가드가 있습니다.
- 이 패턴을 다른 이력성 데이터에 적용할 때도 "닫고 새로 연다"는 원칙을 유지하세요. 절대 기존 레코드의 `teamId`를 덮어쓰지 마세요 — 이력이 사라집니다.

## 3. 권한 검증 원칙 (이중 방어)

이 프로젝트는 **라우트 레벨 + Server Action 레벨**을 모두 검증합니다. 한쪽만 있으면 안 됩니다.

- `src/lib/auth-utils.ts`:
  - `requireUser()` / `requireAdmin()` / `requireManager()` / `requireRole([...])`: 미인증·권한 부족이면 **에러를 던짐**. 모든 Server Action의 **최상단**(다른 로직보다 먼저)에서 호출합니다.
  - `hasRole()` / `isAdmin()` / `isManagerOrAbove()`: 에러 없이 **boolean만 반환**. UI에서 버튼/탭을 조건부 렌더링할 때 씁니다.
- 페이지(Server Component)에서도 `redirect()`로 한 번 더 막습니다 (예: `working-days/page.tsx`, `teams/page.tsx`, `utilization/page.tsx`).
- **민감 데이터는 "숨기기"가 아니라 "안 가져오기"**: 등급/LP처럼 권한에 따라 보이면 안 되는 데이터는, 권한이 없으면 그 데이터를 fetch하는 함수 자체를 호출하지 않습니다 (`isManagerOrAbove()`로 먼저 분기). RSC 페이로드에 아예 실리지 않아야 하기 때문입니다 — UI만 숨기면 개발자도구 네트워크 탭에서 다 보입니다. 대시보드 Widget D(`lp-recent-widget.tsx`)가 이 패턴의 참고 구현입니다.
- Server Action이 폼 없이 직접 호출되는 경우(`changeEmployeeTeam`, `deleteAllocation`, `deleteTeam` 등)도 예외 없이 최상단에 권한 체크가 있어야 합니다. UI에 버튼이 없어도 액션 자체는 여전히 호출 가능한 엔드포인트입니다.

## 4. Prisma `upsert`를 쓰려면 `@unique`부터 확인

Prisma의 `.upsert()`는 유니크 키가 있는 필드에만 쓸 수 있습니다. 이 프로젝트에서 **두 번** 같은 실수를 미리 잡았습니다:

- `EmployeeGrade.employeeId` — 원래 유니크가 아니었는데, "등급은 직원당 하나, 없으면 생성 있으면 갱신" 요구사항 때문에 `@unique`로 바꾸고 `Employee.grades[]`(1:N) → `Employee.grade?`(1:1)로 관계도 수정.
- `DashboardSetting.userId` — 동일한 이유로 `@unique` 추가.

**새 기능에서 "upsert" 요구사항을 보면, 먼저 대상 필드에 `@unique`(또는 복합 유니크)가 있는지 스키마를 확인하세요.** 없으면 스키마부터 고치는 게 맞습니다(어설프게 findFirst+create/update로 흉내내지 마세요 — 레이스 컨디션이 생깁니다).

`ProjectAllocation`은 처음부터 `@@unique([employeeId, projectId, targetMonth])`가 있어서 `employeeId_projectId_targetMonth` 복합 키로 바로 upsert가 가능했습니다 (`allocation.actions.ts`의 `upsertAllocation`).

## 5. 이 환경에서 마이그레이션 만들기 (비대화형 셸)

`npx prisma migrate dev`는 이 셸이 비대화형(non-interactive)이라는 걸 감지하면 **경고가 하나라도 있을 때 무조건 실패**합니다 (`--create-only`를 붙여도 동일). CI/스크립트 환경에서 스키마를 바꿔야 할 때는:

```bash
# 1) SQL만 생성 (적용은 안 함)
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script

# 2) 마이그레이션 폴더를 수동으로 만들고 위 SQL을 migration.sql로 저장
#    (이름 형식: prisma/migrations/<YYYYMMDDHHMMSS>_<설명>/migration.sql)

# 3) 비대화형에서도 안전한 명령으로 적용
npx prisma migrate deploy
npx prisma generate
```

로컬 대화형 터미널에서는 그냥 `npx prisma migrate dev`를 써도 됩니다.

## 6. React 19 `useActionState` 폼 리셋 문제

React 19에서 `<form action={formAction}>`은 액션이 끝나면(**성공이든 검증 실패든 상관없이**) 네이티브 폼처럼 비제어(`defaultValue`) 입력을 리셋시킵니다. 검증에 실패해서 에러 메시지만 보여주려 했는데 사용자가 입력한 값이 통째로 사라지는 버그로 나타납니다.

해결 패턴 (전 프로젝트에 일관 적용됨):

1. **`formDataToRecord(formData)`** (`src/lib/utils.ts`) — Server Action에서 원본 입력값을 문자열 맵으로 만들어 에러 응답의 `values` 필드에 담아 돌려줍니다. (비밀번호처럼 되돌려주면 안 되는 필드는 `values`에 담지 마세요.)
2. **`useFormRemountKey(state)`** (`src/hooks/use-form-remount-key.ts`) — `state`가 바뀔 때마다(=액션이 끝날 때마다) 증가하는 숫자를 반환. 이 값을 `<form key={...}>`에 물리면, 액션이 끝날 때 폼이 다시 마운트되면서 `defaultValue={state.values?.field ?? original}`이 최신 값을 반영합니다.
3. **주의**: 이미 `useState`로 controlled인 필드(예: `grade-form.tsx`의 학력/자격증/경력 입력)까지 포함해서 **폼 전체**를 리마운트하면, 그 controlled state가 초기값으로 되돌아가 버립니다. 이럴 땐 폼 전체가 아니라 **문제되는 필드(주로 shadcn `Select`)에만** `key`를 개별로 줘야 합니다 (`grade-form.tsx`의 `<Select key={selectKey} .../>` 참고).

새 폼을 만들 때 검증 실패 케이스를 꼭 테스트하세요 — 성공 경로만 테스트하면 이 버그를 놓칩니다.

## 7. "use server" 파일 규칙

`"use server"`가 붙은 파일은 **async 함수만 export할 수 있습니다.** 상수, 타입 alias 값(런타임 객체), 클래스 등을 같이 export하면 빌드 타임에 에러가 납니다 (`Error: A "use server" file can only export async functions`).
기본값 배열(`DEFAULT_DASHBOARD_LAYOUT` 등)이나 상수는 `src/lib/`의 별도 파일로 빼고, actions 파일에서는 import해서 함수 안에서만 씁니다. `type` export는 컴파일 타임에 지워지므로 예외입니다.

## 8. `next/dynamic({ ssr: false })`는 Server Component에서 직접 못 씁니다

Server Component 안에서 `dynamic(() => import(...), { ssr: false })`를 직접 호출하면 빌드 에러가 납니다. 클라이언트 전용 라이브러리(react-grid-layout 등)를 늦게 로드하려면:

1. `"use client"` 래퍼 파일을 하나 만들고, 그 안에서 `dynamic(..., { ssr: false })`를 호출.
2. Server Component는 그 래퍼 컴포넌트를 평범하게 import해서 렌더링.

`src/components/dashboard/dashboard-grid.tsx`(래퍼) + `dashboard-grid-inner.tsx`(실제 구현)가 이 패턴의 예시입니다.

## 9. 라우팅 메모

- `app/(dashboard)/page.tsx`는 라우트 그룹이므로 실제 URL은 **`/`**입니다. `/dashboard`가 아닙니다. 로그인 성공 후 리다이렉트, `proxy.ts`의 로그인 페이지 우회 로직 등에서 하드코딩된 경로를 바꿀 때 이 점을 기억하세요.
- 사이드바 메뉴(`src/components/dashboard/sidebar.tsx`)는 `access: "all" | "manager" | "admin"`로 역할별 노출을 제어합니다. 새 페이지를 추가하면 반드시 여기도 같이 갱신하세요 — 과거에 페이지 없이 메뉴만 있거나(죽은 링크) 메뉴 없이 페이지만 있는 상태가 여러 번 있었습니다.

## 10. 이 개발 환경(Windows/로컬) 관련 메모

이건 순수 로컬 세팅 이슈라 프로덕션과는 무관하지만, 이 머신에서 계속 작업한다면 알아두면 좋습니다.

- Node.js/npm이 PATH에 잡히지 않는 새 셸 세션에서는 명령 실행 전에 PATH를 머신/유저 환경변수에서 다시 읽어와야 합니다.
- 작업 디렉토리가 매 턴 초기화되는 경우가 있어, 프로젝트 폴더로 `cd`했는지 항상 확인하세요. 안 그러면 `npm install` 같은 명령이 엉뚱한 상위 폴더에서 실행되어 거기 `node_modules`/`package.json`이 잘못 생깁니다.
- 브라우저 검증(Playwright)은 검증이 끝나면 항상 `npm uninstall playwright`로 제거하고, 시드로 만든 테스트 데이터도 정리합니다 — 상시 devDependency로 남겨두지 않습니다.

## 10-1. 운영(서버 PC) 배포 규칙 — 데이터 보호

팀장들이 서버 PC에서 실제 데이터를 입력합니다. 상세 절차는 `docs/운영-가이드.md`.

- **코드와 데이터는 따로 움직입니다.** DB 파일(`*.db`)은 `.gitignore` 대상이고, 서버 PC의 DB는 프로젝트 폴더 밖(`DATABASE_URL="file:C:/hrm-data/hrm.db"`)에 있습니다. 개발 PC의 DB를 서버로 복사하는 건 최초 이전 1회뿐입니다.
- **스키마 변경은 반드시 마이그레이션 파일로.** 서버는 `scripts/update-server.ps1` → `prisma migrate deploy`로만 반영합니다. 마이그레이션을 만들 때 기존 데이터가 있는 테이블에 필수 컬럼을 추가하면 기본값을 주거나 데이터 이전 SQL을 같이 넣으세요 — 서버 DB는 비어 있지 않습니다.
- **`prisma/seed.ts`는 개발 전용.** 등급 기준을 덮어쓰고 기본 계정·샘플 팀/프로젝트를 만듭니다. 서버에서 실행 금지.
- 운영 모드(`next start`)에서 IP로 접속하려면 `.env`에 `AUTH_TRUST_HOST=true`가 필요합니다(`@auth/core`가 production에서는 host를 기본 불신).
- 백업/복구: `npm run backup [-- 라벨 | --if-changed]`, `npm run restore -- <파일>` (`scripts/backup-db.mjs`, `restore-db.mjs`). DB 파일을 직접 복사하지 말고 이 스크립트를 쓰세요(온라인 백업 API + 무결성 검사).
- 개발 PC 훅(`.claude/settings.local.json`): SessionEnd에 자동 백업, Stop에 `scripts/hooks/check-ops-guide.mjs`가 운영 관련 파일 변경 시 `docs/운영-가이드.md` 갱신 검토를 요구합니다. 그 신호를 받으면 가이드와 이 10-1절을 실제로 검토하고, 바꿀 게 없으면 그렇다고 사용자에게 알리세요. 운영 관련 경로 목록은 그 스크립트의 `OPS_RELEVANT`.

## 11. 권한 매트릭스 요약

| 기능 | 조회 | 생성/수정 | 삭제 |
|---|---|---|---|
| 직원 | 전체 | ADMIN | - |
| 소속 팀 변경 | - | ADMIN | - |
| 등급 / LP | ADMIN, MANAGER | ADMIN, MANAGER | - |
| 조직(팀) | 전체(드롭다운용) / ADMIN(관리 화면) | ADMIN | ADMIN (소속 인원 있으면 차단) |
| 프로젝트 | 전체 | ADMIN, MANAGER | - |
| 투입 인원(MM) | 전체 | ADMIN, MANAGER | ADMIN, MANAGER |
| 워킹데이 | ADMIN | ADMIN | - |
| 전사 가동률 현황 | ADMIN, MANAGER | - | - |
| 대시보드 위젯 A/B/C | 전체 | - | - |
| 대시보드 위젯 D (최근 LP) | ADMIN, MANAGER | - | - |
