import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * FormData를 일반 문자열 맵으로 변환합니다.
 * React 19의 `useActionState` 폼은 액션이 끝나면(성공/실패 무관) 비제어(defaultValue) 입력을
 * 네이티브 폼처럼 리셋시킵니다. 검증 실패 시 사용자가 입력한 값을 그대로 되돌려 보여주기 위해
 * Server Action에서 원본 입력값을 state에 담아 반환할 때 사용합니다.
 */
export function formDataToRecord(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
  )
}
