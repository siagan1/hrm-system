import { redirect } from "next/navigation"

import {
  getNotificationSetting,
  getUtilizationTargets,
} from "@/actions/notification-settings.actions"
import { NotificationSettingsForm } from "@/components/admin/notification-settings-form"
import { UtilizationTargetList } from "@/components/admin/utilization-target-list"
import { isAdmin } from "@/lib/auth-utils"

export default async function NotificationSettingsPage() {
  const admin = await isAdmin()
  if (!admin) {
    redirect("/")
  }

  const [setting, targets] = await Promise.all([
    getNotificationSetting(),
    getUtilizationTargets(),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">알림 설정</h1>
        <p className="text-sm text-muted-foreground">
          대시보드 위젯과 알림함에 표시될 알림 생성 기준을 관리합니다.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">사전알림 기간</h2>
        <NotificationSettingsForm setting={setting} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">연도별 목표 가동률</h2>
        <p className="text-sm text-muted-foreground">
          연도마다 목표 가동률을 따로 설정합니다. 이미 끝난 달의 가동률이 그 해 목표
          미만이면 알림이 생성됩니다.
        </p>
        <UtilizationTargetList targets={targets} />
      </div>
    </div>
  )
}
