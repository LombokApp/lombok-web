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

import type { AppPathContribution } from '@/src/contexts/server'

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
            <img src={`/logo.png`} alt="" className="size-4 object-contain" />
            <span>Default</span>
          </div>
        </SelectItem>
        {options.map((option) => (
          <SelectItem
            key={`${option.appIdentifier}:${option.path}`}
            value={option.appIdentifier}
          >
            <div className="flex items-center gap-2">
              {option.iconPath && (
                <img
                  src={`${window.location.protocol}//${option.appIdentifier}.apps.${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}${option.iconPath ?? ''}`}
                  alt=""
                  className="size-4 object-contain"
                />
              )}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
