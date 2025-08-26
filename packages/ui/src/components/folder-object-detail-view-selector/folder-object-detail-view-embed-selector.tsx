import {
  buttonVariants,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit'

import type { AppRouteLinkContribution } from '@/src/contexts/server.context'

export function FolderObjectDetailViewEmbedSelector({
  options,
  value,
  onSelect,
  placeholder = 'Select a view...',
}: {
  options: AppRouteLinkContribution[]
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
      <SelectTrigger
        className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
      >
        <div className="mr-2">
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem key="default" value="default">
          <div className="flex items-center gap-2">
            <img src={`/logo.png`} alt="" className="size-4 object-contain" />
            <span>Default</span>
          </div>
        </SelectItem>
        {options.map((option) => (
          <SelectItem
            key={option.routeIdentifier}
            value={option.routeIdentifier}
          >
            <div className="flex items-center gap-2">
              {option.iconPath && (
                <img
                  src={`${window.location.protocol}//${option.uiIdentifier}.${option.appIdentifier}.apps.${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}${option.iconPath ?? ''}`}
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
