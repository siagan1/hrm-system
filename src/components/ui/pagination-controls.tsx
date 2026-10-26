import Link from "next/link"

import { Button } from "@/components/ui/button"

function NavLink({
  href,
  disabled,
  children,
}: {
  href: string
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        {children}
      </Button>
    )
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>{children}</Link>
    </Button>
  )
}

/**
 * 서버 컴포넌트 페이지네이션 — URL의 page 파라미터만 바꿔 다시 요청합니다(클라이언트 JS 불필요).
 * basePath와 현재 searchParams(페이지 제외)를 그대로 넘기면 다른 필터 값은 유지된 채 페이지만 바뀝니다.
 */
export function PaginationControls({
  page,
  pageSize,
  totalCount,
  basePath,
  searchParams,
}: {
  page: number
  pageSize: number
  totalCount: number
  basePath: string
  searchParams: Record<string, string | undefined>
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalPages <= 1) return null

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value)
    }
    if (targetPage > 1) params.set("page", String(targetPage))
    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-muted-foreground">
        {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–
        {Math.min(page * pageSize, totalCount)} / 총 {totalCount}건
      </p>
      <div className="flex items-center gap-1">
        <NavLink href={hrefFor(page - 1)} disabled={page <= 1}>
          이전
        </NavLink>
        <span className="px-2 tabular-nums text-muted-foreground">
          {page} / {totalPages}
        </span>
        <NavLink href={hrefFor(page + 1)} disabled={page >= totalPages}>
          다음
        </NavLink>
      </div>
    </div>
  )
}
