import "server-only"

import type { Role } from "@/generated/prisma/client"
import { auth } from "@/auth"

export class UnauthenticatedError extends Error {
  constructor(message = "로그인이 필요합니다.") {
    super(message)
    this.name = "UnauthenticatedError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "이 작업을 수행할 권한이 없습니다.") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export type CurrentUser = {
  id: string
  email?: string | null
  name?: string | null
  role: Role
}

/** 현재 로그인한 사용자를 반환합니다. 로그인하지 않았다면 null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth()
  return session?.user ?? null
}

/** 로그인하지 않았다면 UnauthenticatedError를 던집니다. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthenticatedError()
  return user
}

/** 로그인 + 지정된 role 중 하나가 아니면 ForbiddenError를 던집니다. */
export async function requireRole(allowedRoles: Role[]): Promise<CurrentUser> {
  const user = await requireUser()
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError()
  }
  return user
}

/** ADMIN이 아니면 에러를 던집니다. Server Action의 최상단에서 사용하세요. */
export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole(["ADMIN"])
}

/** ADMIN 또는 MANAGER가 아니면 에러를 던집니다. */
export async function requireManager(): Promise<CurrentUser> {
  return requireRole(["ADMIN", "MANAGER"])
}

/** 에러 없이 role 보유 여부만 확인합니다. UI 조건부 렌더링에 사용하세요. */
export async function hasRole(...roles: Role[]): Promise<boolean> {
  const user = await getCurrentUser()
  return !!user && roles.includes(user.role)
}

export async function isAdmin(): Promise<boolean> {
  return hasRole("ADMIN")
}

export async function isManagerOrAbove(): Promise<boolean> {
  return hasRole("ADMIN", "MANAGER")
}
