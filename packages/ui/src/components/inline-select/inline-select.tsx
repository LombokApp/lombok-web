import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lombokapp/ui-toolkit/components/dropdown-menu'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { ChevronDown } from 'lucide-react'

interface InlineSelectOption<T extends string | number> {
  value: T
  label: string
}

interface InlineSelectProps<T extends string | number> {
  value: T
  options: readonly InlineSelectOption<T>[]
  onChange: (value: T) => void
  className?: string
}

export function InlineSelect<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: InlineSelectProps<T>) {
  const selected = options.find((o) => o.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none',
          className,
        )}
      >
        {selected?.label ?? String(value)}
        <ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={cn(
              'cursor-pointer text-xs',
              option.value === value && 'font-semibold',
            )}
            onSelect={() => onChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
