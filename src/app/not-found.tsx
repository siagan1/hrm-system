import Link from "next/link"
import { IconMapSearch } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-muted/20 text-center">
      <IconMapSearch className="size-8 text-muted-foreground" />
      <div>
        <p className="text-lg font-semibold">페이지를 찾을 수 없습니다.</p>
        <p className="text-sm text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
      </div>
      <Button asChild>
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </div>
  )
}
