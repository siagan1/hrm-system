"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"

import {
  updateNotificationSetting,
  type NotificationSettingState,
  type NotificationSettingValues,
} from "@/actions/notification-settings.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormRemountKey } from "@/hooks/use-form-remount-key"

const initialState: NotificationSettingState = {}

export function NotificationSettingsForm({
  setting,
}: {
  setting: NotificationSettingValues
}) {
  const [state, formAction, isPending] = useActionState(
    updateNotificationSetting,
    initialState
  )
  const formKey = useFormRemountKey(state)

  useEffect(() => {
    if (state.success) toast.success("알림 기준이 저장되었습니다.")
  }, [state])

  return (
    <form key={formKey} action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="regularConversionLeadMonths">정규직 전환 사전알림(개월)</Label>
          <Input
            id="regularConversionLeadMonths"
            name="regularConversionLeadMonths"
            type="number"
            min={0}
            max={24}
            defaultValue={
              state.values?.regularConversionLeadMonths ??
              setting.regularConversionLeadMonths
            }
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contractExtensionLeadMonths">계약직 연장 사전알림(개월)</Label>
          <Input
            id="contractExtensionLeadMonths"
            name="contractExtensionLeadMonths"
            type="number"
            min={0}
            max={24}
            defaultValue={
              state.values?.contractExtensionLeadMonths ??
              setting.contractExtensionLeadMonths
            }
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gradeUpgradeLeadMonths">등급 상승 임박 사전알림(개월)</Label>
          <Input
            id="gradeUpgradeLeadMonths"
            name="gradeUpgradeLeadMonths"
            type="number"
            min={0}
            max={24}
            defaultValue={
              state.values?.gradeUpgradeLeadMonths ?? setting.gradeUpgradeLeadMonths
            }
            required
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        예: 정규직 전환 사전알림을 2개월로 설정하면, 전환 예정일이 2개월 이내로 남은
        직원부터 "인사위원회 필요인력" 위젯과 알림함에 표시됩니다.
      </p>

      {state.error && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  )
}
