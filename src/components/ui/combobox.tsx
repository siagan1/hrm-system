"use client"

import * as React from "react"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ComboboxOption = { value: string; label: string }

/**
 * 검색 가능한 단일 선택 콤보박스. `<Select defaultValue>`와 같은 비제어(uncontrolled)
 * 패턴 — `name`을 주면 폼 제출용 hidden input을 내부에서 관리합니다. React 19
 * useActionState 폼 리셋 이슈 때문에 값을 초기화해야 할 때는(제출 실패 후 등)
 * 이 컴포넌트 자체에 `key`를 물려 리마운트하세요(다른 shadcn Select들과 동일한 패턴).
 */
export function Combobox({
  options,
  defaultValue = "",
  placeholder = "선택",
  searchPlaceholder = "검색...",
  emptyText = "검색 결과가 없습니다.",
  name,
  disabled,
  className,
}: {
  options: ComboboxOption[]
  defaultValue?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  name?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue)
  const selected = options.find((option) => option.value === value)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground",
              className
            )}
          >
            <span className="truncate">{selected ? selected.label : placeholder}</span>
            <IconChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          onOpenAutoFocus={(e) => {
            // Dialog 안에 중첩된 Popover는 두 FocusScope가 경쟁해 cmdk 검색창에
            // 포커스가 안 가는 경우가 있어(특히 Dialog 위에서), 직접 포커스를 맞춥니다.
            e.preventDefault()
            searchInputRef.current?.focus()
          }}
        >
          <Command>
            <CommandInput ref={searchInputRef} placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      setValue(option.value)
                      setOpen(false)
                    }}
                  >
                    <IconCheck
                      className={cn(
                        "size-4",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}
