"use client"

import { useEffect, useState } from "react"

/**
 * useActionState 기반 폼은 액션이 끝나면(성공/실패 무관) 비제어(defaultValue) 입력을
 * 네이티브 폼처럼 리셋시킵니다. 이 훅이 반환하는 값을 <form key={...}>에 지정하면,
 * 액션이 끝날 때마다 폼이 다시 마운트되어 defaultValue가 최신 state를 반영하도록 강제합니다.
 */
export function useFormRemountKey(state: unknown): number {
  const [key, setKey] = useState(0)

  useEffect(() => {
    setKey((prev) => prev + 1)
  }, [state])

  return key
}
