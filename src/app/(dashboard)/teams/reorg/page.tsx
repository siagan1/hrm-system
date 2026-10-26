import Link from "next/link"
import { redirect } from "next/navigation"

import { getOrgStructureForEditing } from "@/actions/org.actions"
import { ReorgEditor } from "@/components/organization/reorg-editor"
import { isAdmin } from "@/lib/auth-utils"

export default async function ReorgPage() {
  const admin = await isAdmin()
  if (!admin) {
    redirect("/")
  }

  const initial = await getOrgStructureForEditing()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/teams"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 조직 관리
        </Link>
        <h1 className="text-2xl font-semibold">새 조직개편 등록</h1>
        <p className="text-sm text-muted-foreground">
          현재 조직 구조를 불러왔습니다. 그룹/팀을 추가·삭제·이름변경·이동한 뒤 효력일과
          함께 한 번에 저장하세요.
        </p>
      </div>

      <ReorgEditor initial={initial} />
    </div>
  )
}
