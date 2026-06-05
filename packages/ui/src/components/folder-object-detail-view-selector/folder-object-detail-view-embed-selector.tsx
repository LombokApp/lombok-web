import { buttonVariants } from '@lombokapp/ui-toolkit/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@lombokapp/ui-toolkit/components/tooltip'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'

import { AppIcon } from '@/src/components/app-icon/app-icon'
import type { AppPathContribution } from '@/src/contexts/server'

import { ServerLogo } from '../server-logo/server-logo'

export function FolderObjectDetailViewEmbedSelector({
  options,
  value,
  onSelect,
  placeholder = 'Select a view...',
}: {
  options: AppPathContribution[]
  value?: string
  onSelect?: (value: string) => void
  placeholder?: string
}) {
  // Handle empty options gracefully
  if (options.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No views available" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={onSelect}>
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <SelectTrigger
              className={cn(
                buttonVariants({ size: 'sm', variant: 'outline' }),
                'gap-2 justify-between',
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Select View</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SelectContent>
        <SelectItem key="default" value="default">
          <div className="flex items-center gap-2">
            <ServerLogo size="sm" className="size-4 object-contain" alt="" />
            <span>Default</span>
          </div>
        </SelectItem>
        {options.map((option) => (
          <SelectItem
            key={`${option.appIdentifier}:${option.path}`}
            value={option.appIdentifier}
          >
            <div className="flex items-center gap-2">
              <AppIcon
                icon={option.icon}
                appIdentifier={option.appIdentifier}
                fallbackLabel={option.label}
                size={16}
              />
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
